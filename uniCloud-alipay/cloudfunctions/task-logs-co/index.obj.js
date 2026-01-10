/**
 * task-logs-co 云对象
 *
 * 功能说明：
 * - 任务操作日志管理
 * - 提供日志记录、查询功能
 * - 支持按项目、用户、任务维度查询日志
 *
 * 主要方法：
 * - getAllLogs: 获取所有动态（用于动态页面）
 * - addLog: 记录任务操作日志
 * - getTaskLogs: 获取指定任务的操作日志
 *
 * 权限说明：
 * - 所有接口需要登录（通过 _before 钩子验证 token）
 * - 日志查询仅返回用户有权限访问的项目数据
 *
 * @module task-logs-co
 * @see https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
 */
const uniIdCommon = require('uni-id-common')

module.exports = {
	/**
	 * 前置钩子 - 验证用户登录状态
	 *
	 * 功能说明：
	 * - 验证客户端传递的 token 是否有效
	 * - 解析 token 获取用户 ID 存储到 this.userInfo
	 * - 初始化数据库连接
	 *
	 * @throws {Object} TOKEN_INVALID - token 缺失或无效
	 */
	_before: async function() {
		this.db = uniCloud.database()

		// 使用 uni-id-common 验证 token 获取用户信息
		const clientInfo = this.getClientInfo()
		this.uniIdCommon = uniIdCommon.createInstance({
			clientInfo
		})

		const token = this.getUniIdToken()
		if (!token) {
			throw {
				errCode: 'TOKEN_INVALID',
				errMsg: '缺少token'
			}
		}

		const payload = await this.uniIdCommon.checkToken(token)
		if (payload.errCode) {
			throw {
				errCode: payload.errCode,
				errMsg: payload.errMsg || '无效的token'
			}
		}

		this.userInfo = {
			uid: payload.uid
		}
	},

	/**
	 * 获取所有动态（用于动态页面）
	 * @param {Object} params 查询参数
	 * @param {String} [params.project_id] 项目ID（可选，筛选特定项目）
	 * @param {String} [params.user_id] 用户ID（可选，筛选特定用户）
	 * @param {Number} [params.page] 页码，默认1
	 * @param {Number} [params.page_size] 每页条数，默认20
	 */
	async getAllLogs(params = {}) {
		const db = this.db
		const dbCmd = db.command
		const $ = dbCmd.aggregate

		try {
			// 获取当前用户有权限的项目
			const projectRes = await db.collection('opendb-projects')
				.where(dbCmd.or([
					{ members: this.userInfo.uid },
					{ managers: this.userInfo.uid }
				]))
				.field({ _id: true })
				.get()

			const projectIds = projectRes.data.map(p => p._id)

			// 如果用户没有任何项目权限
			if (projectIds.length === 0) {
				return {
					code: 0,
					data: {
						list: [],
						total: 0,
						has_projects: false
					}
				}
			}

			// 构建查询条件
			const matchCondition = {
				project_id: dbCmd.in(projectIds)
			}

			// 如果指定了项目ID筛选
			if (params.project_id) {
				// 确保用户对该项目有权限
				if (!projectIds.includes(params.project_id)) {
					return {
						code: 403,
						message: '无权访问该项目'
					}
				}
				matchCondition.project_id = params.project_id
			}

			// 如果指定了用户ID筛选
			if (params.user_id) {
				matchCondition.user_id = params.user_id
			}

			// 分页参数
			const page = parseInt(params.page) || 1
			const pageSize = parseInt(params.page_size) || 20
			const skip = (page - 1) * pageSize

			// 使用聚合查询获取日志并关联用户和项目信息
			const collection = db.collection('opendb-task-logs')
			let query = collection.aggregate()
				.match(matchCondition)

			// 关联用户信息
			query = query.lookup({
				from: 'uni-id-users',
				localField: 'user_id',
				foreignField: '_id',
				as: 'user_info'
			})

			// 关联项目信息
			query = query.lookup({
				from: 'opendb-projects',
				localField: 'project_id',
				foreignField: '_id',
				as: 'project_info'
			})

			// 处理关联结果，提取第一个元素
			query = query.addFields({
				user_nickname: $.ifNull([$.arrayElemAt(['$user_info.nickname', 0]), '未知用户']),
				project_name: $.ifNull([$.arrayElemAt(['$project_info.name', 0]), '未知项目'])
			})

			// 投影：选择要返回的字段
			query = query.project({
				_id: 1,
				action_type: 1,
				task_id: 1,
				project_id: 1,
				task_name: 1,
				action_detail: 1,
				create_time: 1,
				user_id: 1,
				user_nickname: 1,
				project_name: 1
			})

			// 按时间倒序排序
			query = query.sort({
				create_time: -1
			})

			// 分页
			query = query.skip(skip).limit(pageSize)

			// 执行查询
			const { data: list } = await query.end()

			// 获取总数
			const countResult = await collection.where(matchCondition).count()

			return {
				code: 0,
				data: {
					list,
					total: countResult.total,
					has_projects: true
				}
			}
		} catch (e) {
			console.error('获取动态列表失败:', e)
			return {
				code: -1,
				message: e.message || '获取动态列表失败'
			}
		}
	},

	/**
	 * 记录任务日志
	 * @param {Object} params 日志参数
	 * @param {String} params.action_type 动作类型：create, update, delete, complete
	 * @param {String} params.task_id 任务ID
	 * @param {String} params.project_id 项目ID
	 * @param {String} [params.task_name] 任务名称
	 * @param {String} params.action_detail 动作详情
	 * @param {Object} [params.extra_data] 额外数据
	 */
	async addLog(params = {}) {
		// 参数校验
		if (!params.action_type) {
			return {
				code: -1,
				message: 'action_type 不能为空'
			}
		}

		if (!params.task_id) {
			return {
				code: -1,
				message: 'task_id 不能为空'
			}
		}

		if (!params.project_id) {
			return {
				code: -1,
				message: 'project_id 不能为空'
			}
		}

		if (!params.action_detail) {
			return {
				code: -1,
				message: 'action_detail 不能为空'
			}
		}

		try {
			const logData = {
				action_type: params.action_type,
				task_id: params.task_id,
				project_id: params.project_id,
				task_name: params.task_name || '',
				user_id: this.userInfo.uid,
				action_detail: params.action_detail,
				extra_data: params.extra_data || {},
				create_time: Date.now()
			}

			const res = await this.db.collection('opendb-task-logs').add(logData)

			return {
				code: 0,
				data: {
					id: res.id
				}
			}
		} catch (e) {
			console.error('添加日志失败:', e)
			return {
				code: -1,
				message: e.message || '添加日志失败'
			}
		}
	},

	/**
	 * 获取任务的操作日志
	 * @param {Object} params 查询参数
	 * @param {String} params.task_id 任务ID
	 * @param {Number} [params.page] 页码
	 * @param {Number} [params.page_size] 每页条数
	 */
	async getTaskLogs(params = {}) {
		if (!params.task_id) {
			return {
				code: -1,
				message: 'task_id 不能为空'
			}
		}

		const db = this.db
		const $ = db.command.aggregate

		try {
			const page = parseInt(params.page) || 1
			const pageSize = parseInt(params.page_size) || 20
			const skip = (page - 1) * pageSize

			const collection = db.collection('opendb-task-logs')

			let query = collection.aggregate()
				.match({
					task_id: params.task_id
				})

			// 关联用户信息
			query = query.lookup({
				from: 'uni-id-users',
				localField: 'user_id',
				foreignField: '_id',
				as: 'user_info'
			})

			// 处理关联结果
			query = query.addFields({
				user_nickname: $.ifNull([$.arrayElemAt(['$user_info.nickname', 0]), '未知用户'])
			})

			// 投影
			query = query.project({
				_id: 1,
				action_type: 1,
				action_detail: 1,
				create_time: 1,
				user_id: 1,
				user_nickname: 1
			})

			// 排序
			query = query.sort({
				create_time: -1
			})

			// 分页
			query = query.skip(skip).limit(pageSize)

			const { data: list } = await query.end()

			// 获取总数
			const countResult = await collection.where({
				task_id: params.task_id
			}).count()

			return {
				code: 0,
				data: {
					list,
					total: countResult.total
				}
			}
		} catch (e) {
			console.error('获取任务日志失败:', e)
			return {
				code: -1,
				message: e.message || '获取任务日志失败'
			}
		}
	}
}
