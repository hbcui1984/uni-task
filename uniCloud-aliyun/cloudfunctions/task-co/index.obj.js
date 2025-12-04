// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
// jsdoc语法提示教程：https://ask.dcloud.net.cn/docs/#//ask.dcloud.net.cn/article/129
const uniIdCommon = require('uni-id-common')

module.exports = {
	_before: async function() { // 通用预处理器
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

	_after: async function(error, result) {
		// 如果发生错误，直接返回错误
		if (error) {
			throw error
		}

		// 返回结果（暂时禁用日志记录，排查问题）
		return result
	},

	/**
	 * 获取用户动态
	 * @param {Object} params 查询参数
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
	 * @param {Object} params 查询参数
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
	 * @param {String} taskId 任务ID
	 * @param {Number} newStatus 新状态 0-未开始 1-进行中 2-已完成
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
	 * @param {String} taskId 任务ID
	 * @param {Number} index 附件索引
	 * @param {Object} item 附件项
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
	 * 新增任务（支持url化调用）
	 * @param {Object} params 任务参数
	 * @param {String} params.project_id 项目ID
	 * @param {String} params.title 任务标题
	 * @param {String} [params.content] 任务内容
	 * @param {String} [params.group_id] 分组ID
	 * @param {String} [params.assignee] 负责人ID
	 * @param {Number} [params.deadline] 截止日期（时间戳）
	 * @param {Number} [params.priority] 优先级
	 * @param {Number} [params.order] 排序号
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
	
	async updateTask() {

		const httpInfo = this.getHttpInfo()

		const params = JSON.parse(httpInfo.body)

		console.log(typeof params);

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
	 * @param {Object} params 参数
	 * @param {String} params.taskId 任务ID
	 * @param {String} params.taskName 任务名称（用于记录日志）
	 * @param {String} params.project_id 项目ID（用于记录日志）
	 */
	async deleteTask(params = {}) {
		if (!params.taskId) {
			return {
				errCode: 'PARAM_ERROR',
				errMsg: '任务ID不能为空'
			}
		}

		try {
			// 删除任务
			await this.db.collection('opendb-task').doc(params.taskId).remove()

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

	async getTaskList(params = {}) {
		try {
			// 验证必填参数
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

	}



}