/**
 * task-co 云对象
 *
 * 功能说明：
 * - 任务管理相关的后端接口
 * - 提供任务增删改查、状态变更、附件管理等功能
 * - 支持 URL 化调用（addTask, updateTask）
 *
 * 主要方法：
 * - addTask: 新增任务（支持URL化）
 * - updateTask: 更新任务（支持URL化）
 * - deleteTask: 删除任务
 * - changeState: 修改任务状态
 * - deleteAttachment: 删除任务附件
 * - getTaskList: 获取任务列表
 * - getUserLogs: 获取用户动态
 * - getProjectLogs: 获取项目动态
 *
 * 权限说明：
 * - 所有接口需要登录（通过 _before 钩子验证 token）
 *
 * @module task-co
 * @see https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
 */
const uniIdCommon = require('uni-id-common')

const db = uniCloud.database()

/**
 * 检查用户是否有权限删除任务
 * 权限规则：项目管理员 或 任务负责人 可删除
 *
 * @param {Object} task - 任务对象
 * @param {string} uid - 用户ID
 * @returns {boolean} 是否有删除权限
 */
async function checkDeletePermission(task, uid) {
	if (!task || !uid) {
		return false
	}

	try {
		const projectId = task.project_id
		if (!projectId) {
			return false
		}

		// 1. 检查是否是任务负责人
		if (task.assignee === uid) {
			return true
		}

		// 2. 检查是否是项目管理员
		const projectRes = await db.collection('opendb-projects').doc(projectId).get()
		if (projectRes?.data?.length > 0) {
			const project = projectRes.data[0]
			const isManager = project.managers?.includes(uid) === true
			if (isManager) {
				return true
			}
		}

		return false
	} catch (err) {
		console.error('checkDeletePermission error:', err)
		return false
	}
}

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

		// 记录原始参数，供 _after 使用
		this.originalParams = this.getParams()
	},

	/**
	 * 后置钩子 - 统一处理返回结果
	 *
	 * 功能说明：
	 * - 统一处理错误和结果返回
	 * - 可用于记录操作日志（当前已禁用）
	 */
	_after: async function(error, result) {
		if (error) {
			throw error
		}
		return result
	},

	/**
	 * 获取用户动态
	 *
	 * 功能说明：
	 * - 查询指定用户的操作动态记录
	 * - 支持时间范围筛选和分页
	 * - 关联用户信息和项目信息
	 *
	 * @param {Object} params - 查询参数
	 * @param {string} [params.user_id] - 用户ID，不传则查询所有用户
	 * @param {number} [params.start_time] - 开始时间戳
	 * @param {number} [params.end_time] - 结束时间戳
	 * @param {number} [params.page=1] - 页码
	 * @param {number} [params.pageSize=20] - 每页数量
	 * @returns {Object} { errCode, errMsg, data: { list, total, page, pageSize } }
	 */
	async getUserLogs(params = {}) {
		const db = uniCloud.database()
		const $ = db.command.aggregate

		try {
			const collection = db.collection('opendb-task-logs')
			let query = collection.aggregate()

			// 如果指定了用户ID，则只查询该用户的动态
			if (params.user_id) {
				query = query.match({
					user_id: params.user_id
				})
			}

			// 如果指定了时间范围
			if (params.start_time) {
				query = query.match({
					create_time: $.gte(params.start_time)
				})
			}
			if (params.end_time) {
				query = query.match({
					create_time: $.lte(params.end_time)
				})
			}

			// 分页处理
			const page = parseInt(params.page) || 1
			const pageSize = parseInt(params.pageSize) || 20
			const skip = (page - 1) * pageSize

			// 关联用户信息
			query = query.lookup({
				from: 'uni-id-users',
				localField: 'user_id',
				foreignField: '_id',
				as: 'user'
			})

			// 关联项目信息
			query = query.lookup({
				from: 'opendb-project',
				localField: 'project_id',
				foreignField: '_id',
				as: 'project'
			})

			// 处理关联结果
			query = query.addFields({
				user: $.arrayElemAt(['$user', 0]),
				project: $.arrayElemAt(['$project', 0])
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
				'user._id': 1,
				'user.username': 1,
				'user.nickname': 1,
				'project._id': 1,
				'project.name': 1
			})

			// 按时间倒序排序
			query = query.sort({
				create_time: -1
			})

			// 分页
			query = query.skip(skip).limit(pageSize)

			// 执行查询
			const {
				data
			} = await query.end()

			// 获取总数
			const countResult = await collection.where(params.user_id ? {
				user_id: params.user_id
			} : {}).count()

			return {
				errCode: 0,
				errMsg: '获取成功',
				data: {
					list: data,
					total: countResult.total,
					page,
					pageSize
				}
			}
		} catch (e) {
			return {
				errCode: 'GET_USER_LOGS_FAILED',
				errMsg: e.message
			}
		}
	},

	/**
	 * 获取项目动态
	 *
	 * 功能说明：
	 * - 查询指定项目的操作动态记录
	 * - 支持时间范围筛选和分页
	 * - 关联用户信息
	 *
	 * @param {Object} params - 查询参数
	 * @param {string} params.project_id - 项目ID（必填）
	 * @param {number} [params.start_time] - 开始时间戳
	 * @param {number} [params.end_time] - 结束时间戳
	 * @param {number} [params.page=1] - 页码
	 * @param {number} [params.pageSize=20] - 每页数量
	 * @returns {Object} { errCode, errMsg, data: { list, total, page, pageSize } }
	 */
	async getProjectLogs(params = {}) {
		if (!params.project_id) {
			return {
				errCode: 'PARAM_ERROR',
				errMsg: '项目ID不能为空'
			}
		}

		const db = uniCloud.database()
		const $ = db.command.aggregate

		try {
			const collection = db.collection('opendb-task-logs')
			let query = collection.aggregate()
				.match({
					project_id: params.project_id
				})

			// 如果指定了时间范围
			if (params.start_time) {
				query = query.match({
					create_time: $.gte(params.start_time)
				})
			}
			if (params.end_time) {
				query = query.match({
					create_time: $.lte(params.end_time)
				})
			}

			// 分页处理
			const page = parseInt(params.page) || 1
			const pageSize = parseInt(params.pageSize) || 20
			const skip = (page - 1) * pageSize

			// 关联用户信息
			query = query.lookup({
				from: 'uni-id-users',
				localField: 'user_id',
				foreignField: '_id',
				as: 'user'
			})

			// 处理关联结果
			query = query.addFields({
				user: $.arrayElemAt(['$user', 0])
			})

			// 投影：选择要返回的字段
			query = query.project({
				_id: 1,
				action_type: 1,
				task_id: 1,
				task_name: 1,
				action_detail: 1,
				create_time: 1,
				'user._id': 1,
				'user.username': 1,
				'user.nickname': 1
			})

			// 按时间倒序排序
			query = query.sort({
				create_time: -1
			})

			// 分页
			query = query.skip(skip).limit(pageSize)

			// 执行查询
			const {
				data
			} = await query.end()

			// 获取总数
			const countResult = await collection.where({
				project_id: params.project_id
			}).count()

			return {
				errCode: 0,
				errMsg: '获取成功',
				data: {
					list: data,
					total: countResult.total,
					page,
					pageSize
				}
			}
		} catch (e) {
			return {
				errCode: 'GET_PROJECT_LOGS_FAILED',
				errMsg: e.message
			}
		}
	},
	/**
	 * 修改任务状态
	 *
	 * 功能说明：
	 * - 更新任务的状态（未开始/进行中/已完成）
	 * - 完成任务时自动记录完成人和完成时间
	 * - 重新打开任务时清除完成信息
	 *
	 * @param {string} taskId - 任务ID
	 * @param {number} newStatus - 新状态：0-未开始, 1-进行中, 2-已完成
	 * @returns {Object} { errCode: 0, errMsg: '状态更新成功' }
	 * @throws {Object} TASK_NOT_FOUND - 任务不存在
	 * @throws {Object} STATUS_UNCHANGED - 状态未变化
	 */
	async changeState(taskId, newStatus) {
		// 参数校验
		if (!taskId) {
			return {
				errCode: 'PARAM_ERROR',
				errMsg: '任务ID不能为空'
			}
		}

		if (![0, 1, 2].includes(newStatus)) {
			return {
				errCode: 'PARAM_ERROR',
				errMsg: '状态值无效'
			}
		}

		try {
			// 获取任务信息
			const taskRes = await this.db.collection('opendb-task').doc(taskId).get()

			if (taskRes.data.length === 0) {
				return {
					errCode: 'TASK_NOT_FOUND',
					errMsg: '任务不存在'
				}
			}

			const oldTask = taskRes.data[0]
			const oldStatus = oldTask.status

			if (oldStatus === newStatus) {
				return {
					errCode: 'STATUS_UNCHANGED',
					errMsg: '任务状态未变化'
				}
			}

			// 更新数据
			const updateData = {
				status: newStatus,
				update_uid: this.userInfo.uid,
				update_time: Date.now()
			}

			// 如果是完成任务，记录完成人和完成时间
			if (newStatus === 2) {
				updateData.completion_uid = this.userInfo.uid
				updateData.completion_date = Date.now()
			} else {
				// 如果是重新打开任务，清除完成时间和完成人
				const dbCmd = this.db.command
				updateData.completion_uid = dbCmd.remove()
				updateData.completion_date = dbCmd.remove()
			}

			await this.db.collection('opendb-task').doc(taskId).update(updateData)

			// 记录状态变更日志
			const statusMap = { 0: '未开始', 1: '进行中', 2: '已完成' }
			const isSubTask = !!oldTask.parent_id
			let actionType = 'update'
			let actionDetail = ''

			if (newStatus === 2) {
				actionType = 'complete'
				actionDetail = isSubTask
					? `完成了子任务「${oldTask.title}」`
					: `完成了任务「${oldTask.title}」`
			} else if (oldStatus === 2 && newStatus === 0) {
				actionDetail = isSubTask
					? `重新打开了子任务「${oldTask.title}」`
					: `重新打开了任务「${oldTask.title}」`
			} else {
				actionDetail = `更新了任务「${oldTask.title}」：状态：${statusMap[oldStatus] || '未知'} → ${statusMap[newStatus] || '未知'}`
			}

			const logData = {
				action_type: actionType,
				task_id: taskId,
				project_id: oldTask.project_id,
				task_name: oldTask.title,
				user_id: this.userInfo.uid,
				action_detail: actionDetail,
				create_time: Date.now()
			}

			// 如果是子任务，记录父任务ID，便于查询
			if (oldTask.parent_id) {
				logData.parent_task_id = oldTask.parent_id
			}

			await this.db.collection('opendb-task-logs').add(logData)

			return {
				errCode: 0,
				errMsg: '状态更新成功'
			}
		} catch (e) {
			console.error('修改任务状态失败:', e)
			return {
				errCode: 'CHANGE_STATE_FAILED',
				errMsg: e.message
			}
		}
	},
	/**
	 * 删除任务附件
	 *
	 * 功能说明：
	 * - 删除任务的指定附件
	 * - 同时从云存储中删除文件
	 * - 验证附件索引和文件ID匹配
	 *
	 * @param {string} taskId - 任务ID
	 * @param {number} index - 附件在数组中的索引
	 * @param {Object} item - 附件信息对象
	 * @param {string} item.fileID - 云存储文件ID
	 * @returns {Object} { errCode: 0, errMsg: '删除成功' }
	 * @throws {Object} TASK_NOT_FOUND - 任务不存在
	 * @throws {Object} ATTACHMENT_NOT_FOUND - 附件不存在
	 * @throws {Object} ATTACHMENT_NOT_MATCH - 附件信息不匹配
	 */
	async deleteAttachment(taskId, index, item) {
		// 参数校验
		if (!taskId) {
			return {
				errCode: 'PARAM_ERROR',
				errMsg: '任务ID不能为空'
			}
		}

		if (index === undefined || index < 0) {
			return {
				errCode: 'PARAM_ERROR',
				errMsg: '附件索引无效'
			}
		}

		if (!item || !item.fileID) {
			return {
				errCode: 'PARAM_ERROR',
				errMsg: '附件信息不完整'
			}
		}

		try {
			// 获取任务信息
			const taskRes = await this.db.collection('opendb-task').doc(taskId).get()

			if (taskRes.data.length === 0) {
				return {
					errCode: 'TASK_NOT_FOUND',
					errMsg: '任务不存在'
				}
			}

			const task = taskRes.data[0]

			if (!task.attachments || task.attachments.length <= index) {
				return {
					errCode: 'ATTACHMENT_NOT_FOUND',
					errMsg: '附件不存在'
				}
			}

			const oldAttachments = task.attachments
			const oldFileObj = oldAttachments[index]

			if (oldFileObj.fileID !== item.fileID) {
				return {
					errCode: 'ATTACHMENT_NOT_MATCH',
					errMsg: '附件不匹配'
				}
			}

			// 删除文件
			const fileList = [item.fileID]
			await uniCloud.deleteFile({
				fileList
			})

			// 更新数据库
			oldAttachments.splice(index, 1)
			await this.db.collection('opendb-task').doc(taskId).update({
				attachments: oldAttachments,
				update_uid: this.userInfo.uid,
				update_time: Date.now()
			})

			return {
				errCode: 0,
				errMsg: '删除成功'
			}
		} catch (e) {
			console.error('删除附件失败:', e)
			return {
				errCode: 'DELETE_ATTACHMENT_FAILED',
				errMsg: e.message
			}
		}
	},
	/**
	 * 新增任务
	 *
	 * 功能说明：
	 * - 创建新任务，支持 URL 化调用
	 * - 通过 HTTP Body 传递参数（JSON 格式）
	 * - 自动设置初始状态为未开始(0)
	 *
	 * @param {Object} body - HTTP Body 参数（JSON）
	 * @param {string} body.project_id - 项目ID（必填）
	 * @param {string} body.title - 任务标题（必填）
	 * @param {string} [body.content] - 任务内容/描述
	 * @param {string} [body.group_id] - 分组ID
	 * @param {string} [body.assignee] - 负责人用户ID
	 * @param {number} [body.deadline] - 截止日期时间戳
	 * @param {number} [body.priority=1] - 优先级：0-较低, 1-普通, 2-较高, 3-最高
	 * @param {number} [body.order=0] - 排序号
	 * @returns {Object} { errCode: 0, errMsg: '任务添加成功', data: { task_id } }
	 */
	async addTask() {

		const httpInfo = this.getHttpInfo()

		const params = JSON.parse(httpInfo.body)

		console.log(typeof params);

		console.log("addTask receive:", params)

		if (!params.project_id || !params.title) {
			return {
				errCode: 'PARAM_ERROR',
				errMsg: 'project_id 和 title 为必填项'
			}
		}

		try {
			const taskData = {
				project_id: params.project_id,
				title: params.title,
				content: params.content || '',
				group_id: params.group_id || null,
				assignee: params.assignee || '',
				deadline: params.deadline || null,
				priority: params.priority || 1,
				order: params.order || 0,
				status: 0,
				create_date: Date.now(),
				attachments: []
			}
			const res = await this.db.collection('opendb-task').add(taskData)
			return {
				errCode: 0,
				errMsg: '任务添加成功',
				data: {
					task_id: res.id
				}
			}
		} catch (e) {
			console.error('addTask error:', e)
			return {
				errCode: 'ADD_TASK_FAILED',
				errMsg: e.message
			}
		}
	},
	
	/**
	 * 更新任务
	 *
	 * 功能说明：
	 * - 更新现有任务信息，支持 URL 化调用
	 * - 通过 HTTP Body 传递参数（JSON 格式）
	 * - 自动记录更新人和更新时间
	 *
	 * @param {Object} body - HTTP Body 参数（JSON）
	 * @param {string} body.id - 任务ID（必填）
	 * @param {string} [body.title] - 任务标题
	 * @param {string} [body.content] - 任务内容/描述
	 * @param {string} [body.project_id] - 项目ID
	 * @param {string} [body.group_id] - 分组ID
	 * @param {string} [body.assignee] - 负责人用户ID
	 * @param {number} [body.deadline] - 截止日期时间戳
	 * @param {number} [body.priority] - 优先级
	 * @param {number} [body.status] - 状态
	 * @param {number} [body.order] - 排序号
	 * @returns {Object} { errCode: 0, errMsg: '任务更新成功', data: { task_id } }
	 */
	async updateTask() {
		const httpInfo = this.getHttpInfo()
		const params = JSON.parse(httpInfo.body)

		console.log("updateTask receive:", params)

		if (!params.id) {
			return {
				errCode: 'PARAM_ERROR',
				errMsg: 'id 为必填项'
			}
		}

		try {
			const taskData = {
				title: params.title,
				content: params.content || '',
				group_id: params.group_id || null,
				assignee: params.assignee || '',
				deadline: params.deadline || null,
				priority: params.priority || 1,
				order: params.order || 0,
				status: params.status !== undefined ? params.status : 0,
				update_uid: this.userInfo.uid,
				update_time: Date.now()
			}

			// 只在传入project_id时更新
			if (params.project_id) {
				taskData.project_id = params.project_id
			}

			// 移除空值
			Object.keys(taskData).forEach(key => {
				if (taskData[key] === undefined || taskData[key] === null) {
					delete taskData[key]
				}
			})

			const res = await this.db.collection('opendb-task').doc(params.id).update(taskData)
			return {
				errCode: 0,
				errMsg: '任务更新成功',
				data: {
					task_id: params.id
				}
			}
		} catch (e) {
			console.error('updateTask error:', e)
			return {
				errCode: 'UPDATE_TASK_FAILED',
				errMsg: e.message
			}
		}
	},

	/**
	 * 删除任务
	 *
	 * 功能说明：
	 * - 删除指定任务
	 * - 此操作不可恢复
	 * - 权限：项目管理员 或 任务负责人 可删除
	 *
	 * @param {Object} params - 参数对象
	 * @param {string} params.taskId - 任务ID（必填）
	 * @param {string} [params.taskName] - 任务名称（用于日志记录）
	 * @param {string} [params.project_id] - 项目ID（用于日志记录）
	 * @returns {Object} { errCode: 0, errMsg: '删除成功' }
	 * @throws {Object} PERMISSION_DENIED - 没有删除权限
	 */
	async deleteTask(params = {}) {
		if (!params.taskId) {
			return {
				errCode: 'PARAM_ERROR',
				errMsg: '任务ID不能为空'
			}
		}

		try {
			// 先获取任务信息用于权限检查和日志记录
			const taskRes = await this.db.collection('opendb-task').doc(params.taskId).get()

			const task = taskRes.data && taskRes.data[0]

			if (!task) {
				return {
					errCode: 'TASK_NOT_FOUND',
					errMsg: '任务不存在'
				}
			}

			// 权限检查：项目管理员 或 任务负责人 可删除
			const uid = this.userInfo.uid
			const canDelete = await checkDeletePermission(task, uid)
			if (!canDelete) {
				return {
					errCode: 'PERMISSION_DENIED',
					errMsg: '您没有权限删除该任务，只有项目管理员或任务负责人可以删除'
				}
			}

			// 保存任务信息用于记录日志
			const taskTitle = task.title
			const taskProjectId = task.project_id
			const isSubTask = !!task.parent_id
			const parentTaskId = task.parent_id

			// 删除任务
			await this.db.collection('opendb-task').doc(params.taskId).remove()

			// 记录删除日志
			const actionDetail = isSubTask
				? `删除了子任务「${taskTitle}」`
				: `删除了任务「${taskTitle}」`

			const logData = {
				action_type: 'delete',
				task_id: params.taskId,
				project_id: taskProjectId,
				task_name: taskTitle,
				user_id: this.userInfo.uid,
				action_detail: actionDetail,
				create_time: Date.now()
			}

			// 如果是子任务，记录父任务ID，便于查询
			if (parentTaskId) {
				logData.parent_task_id = parentTaskId
			}

			await this.db.collection('opendb-task-logs').add(logData)

			return {
				errCode: 0,
				errMsg: '删除成功'
			}
		} catch (e) {
			console.error('deleteTask error:', e)
			return {
				errCode: 'DELETE_TASK_FAILED',
				errMsg: e.message
			}
		}
	},

	/**
	 * 获取任务列表
	 *
	 * 功能说明：
	 * - 分页获取指定项目的任务列表
	 * - 支持按状态和负责人筛选
	 * - 按创建时间倒序排列
	 *
	 * @param {Object} params - 查询参数
	 * @param {string} params.project_id - 项目ID（必填）
	 * @param {number} [params.status] - 任务状态筛选
	 * @param {string} [params.assignee] - 负责人ID筛选
	 * @param {number} [params.pageId=1] - 页码
	 * @param {number} [params.pageSize=10] - 每页数量
	 * @returns {Object} { errCode, errMsg, data: { list, total, pageId, pageSize } }
	 */
	async getTaskList(params = {}) {
		try {
			if (!params.project_id) {
				return {
					errCode: 'PARAM_ERROR',
					errMsg: 'project_id 为必填项'
				}
			}

			// 解析分页参数
			const pageId = parseInt(params.pageId) || 1;
			const pageSize = parseInt(params.pageSize) || 10;
			const skip = (pageId - 1) * pageSize;

			// 构建查询条件
			const query = {
				project_id: params.project_id
			}

			// 如果有状态筛选
			if (params.status !== undefined) {
				query.status = params.status
			}

			// 如果有负责人筛选
			if (params.assignee) {
				query.assignee = params.assignee
			}

			// 查询任务列表
			const taskList = await this.db.collection('opendb-task')
				.where(query)
				.orderBy('create_date', 'desc')
				.skip(skip)
				.limit(pageSize)
				.get();

			// 获取总数
			const countResult = await this.db.collection('opendb-task').where(query).count();

			return {
				errCode: 0,
				errMsg: '获取任务列表成功',
				data: {
					list: taskList.data,
					total: countResult.total,
					pageId,
					pageSize
				}
			};
		} catch (e) {
			console.error('getTaskList error:', e);
			return {
				errCode: 'GET_TASK_LIST_FAILED',
				errMsg: e.message
			};
		}

	},

	/**
	 * 添加评论
	 *
	 * @param {Object} params - 参数对象
	 * @param {string} params.task_id - 任务ID（必填）
	 * @param {string} params.content - 评论内容（必填）
	 * @param {Array} [params.mentioned_users] - 被@的用户ID列表
	 * @returns {Object} { errCode: 0, errMsg: '评论成功', data: { comment_id } }
	 */
	async addComment(params = {}) {
		if (!params.task_id || !params.content) {
			return {
				errCode: 'PARAM_ERROR',
				errMsg: '任务ID和评论内容不能为空'
			}
		}

		try {
			// 获取任务信息
			const taskRes = await this.db.collection('opendb-task').doc(params.task_id).get()
			const task = taskRes.data && taskRes.data[0]

			if (!task) {
				return {
					errCode: 'TASK_NOT_FOUND',
					errMsg: '任务不存在'
				}
			}

			// 添加评论
			const commentData = {
				task_id: params.task_id,
				content: params.content,
				user_id: this.userInfo.uid,
				create_time: Date.now()
			}

			if (params.mentioned_users && params.mentioned_users.length > 0) {
				commentData.mentioned_users = params.mentioned_users
			}

			const result = await this.db.collection('task-comments').add(commentData)

			// 记录评论动态
			const contentPreview = params.content.length > 30
				? params.content.substring(0, 30) + '...'
				: params.content

			await this.db.collection('opendb-task-logs').add({
				action_type: 'comment',
				task_id: params.task_id,
				project_id: task.project_id,
				task_name: task.title,
				user_id: this.userInfo.uid,
				action_detail: `评论了任务「${task.title}」：${contentPreview}`,
				create_time: Date.now()
			})

			return {
				errCode: 0,
				errMsg: '评论成功',
				data: {
					comment_id: result.id
				}
			}
		} catch (e) {
			console.error('addComment error:', e)
			return {
				errCode: 'ADD_COMMENT_FAILED',
				errMsg: e.message
			}
		}
	},

	/**
	 * 删除评论
	 *
	 * @param {Object} params - 参数对象
	 * @param {string} params.comment_id - 评论ID（必填）
	 * @returns {Object} { errCode: 0, errMsg: '删除成功' }
	 */
	async deleteComment(params = {}) {
		if (!params.comment_id) {
			return {
				errCode: 'PARAM_ERROR',
				errMsg: '评论ID不能为空'
			}
		}

		try {
			// 获取评论信息
			const commentRes = await this.db.collection('task-comments').doc(params.comment_id).get()
			const comment = commentRes.data && commentRes.data[0]

			if (!comment) {
				return {
					errCode: 'COMMENT_NOT_FOUND',
					errMsg: '评论不存在'
				}
			}

			// 获取任务信息
			const taskRes = await this.db.collection('opendb-task').doc(comment.task_id).get()
			const task = taskRes.data && taskRes.data[0]

			// 删除评论
			await this.db.collection('task-comments').doc(params.comment_id).remove()

			// 记录删除评论动态
			if (task) {
				await this.db.collection('opendb-task-logs').add({
					action_type: 'delete_comment',
					task_id: comment.task_id,
					project_id: task.project_id,
					task_name: task.title,
					user_id: this.userInfo.uid,
					action_detail: `删除了任务「${task.title}」的评论`,
					create_time: Date.now()
				})
			}

			return {
				errCode: 0,
				errMsg: '删除成功'
			}
		} catch (e) {
			console.error('deleteComment error:', e)
			return {
				errCode: 'DELETE_COMMENT_FAILED',
				errMsg: e.message
			}
		}
	}

}