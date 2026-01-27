/**
 * project-co 云对象
 *
 * 功能说明：
 * - 项目管理相关的后端接口
 * - 提供项目成员管理、权限控制、项目增删改查等功能
 *
 * 主要方法：
 * - getAllUsersWithMemberStatus: 获取所有用户及项目成员状态（成员管理页面用）
 * - getMembersList: 获取项目成员列表
 * - updateProject: 更新项目信息
 * - deleteProject: 删除项目及关联数据
 * - toggleArchive: 归档/取消归档项目
 * - addMember: 添加项目成员
 * - removeMember: 移除项目成员
 * - toggleManager: 设置/取消管理员权限
 *
 * 权限说明：
 * - 所有接口需要登录（通过 _before 钩子验证 token）
 * - 部分接口需要项目成员权限（checkIsMember）
 * - 部分接口需要项目管理员权限（checkIsManager）
 *
 * @module project-co
 * @see https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
 */
const uniIdCommon = require('uni-id-common')

const db = uniCloud.database()
const dbCmd = db.command

/**
 * 检查用户是否是项目成员（成员或管理员）
 * @param {string} projectId 项目ID
 * @param {string} uid 用户ID
 */
async function checkIsMember(projectId, uid) {
	const project = await db.collection('opendb-projects').doc(projectId).get()
	if (!project.data || project.data.length === 0) {
		return { success: false, error: '项目不存在' }
	}
	const projectData = project.data[0]
	const isMember = (projectData.members || []).includes(uid) ||
	                 (projectData.managers || []).includes(uid)
	return { success: isMember, project: projectData, error: isMember ? null : '您不是该项目成员' }
}

/**
 * 检查用户是否是项目管理员
 * @param {string} projectId 项目ID
 * @param {string} uid 用户ID
 */
async function checkIsManager(projectId, uid) {
	const project = await db.collection('opendb-projects').doc(projectId).get()
	if (!project.data || project.data.length === 0) {
		return { success: false, error: '项目不存在' }
	}
	const projectData = project.data[0]
	const isManager = (projectData.managers || []).includes(uid)
	return { success: isManager, project: projectData, error: isManager ? null : '仅项目管理员可执行此操作' }
}

module.exports = {
	/**
	 * 前置钩子 - 验证用户登录状态
	 *
	 * 功能说明：
	 * - 验证客户端传递的 token 是否有效
	 * - 解析 token 获取用户 ID 存储到 this.userInfo
	 * - token 无效时抛出异常阻止后续方法执行
	 *
	 * @throws {Object} TOKEN_INVALID - token 缺失或无效
	 */
	_before: async function() {
		const clientInfo = this.getClientInfo()
		this.uniIdCommon = uniIdCommon.createInstance({ clientInfo })

		const token = this.getUniIdToken()
		if (!token) {
			throw { errCode: 'TOKEN_INVALID', errMsg: '缺少token' }
		}

		const payload = await this.uniIdCommon.checkToken(token)
		if (payload.errCode) {
			throw { errCode: payload.errCode, errMsg: payload.errMsg || '无效的token' }
		}

		this.userInfo = { uid: payload.uid }
	},

	/**
	 * 获取所有用户及其在项目中的成员状态
	 *
	 * 功能说明：
	 * - 用于成员管理页面，展示所有用户并标记其项目角色
	 * - 返回用户列表，每个用户包含是否已加入项目、角色信息
	 *
	 * @param {string} pid - 项目ID
	 * @returns {Object} 返回结果
	 * @returns {string[]} returns.members - 普通成员ID数组
	 * @returns {Array} returns.userList - 用户列表，包含 _id, nickname, join_project, role_in_project
	 * @throws {Object} PERMISSION_DENIED - 非项目管理员无权访问
	 */
	async getAllUsersWithMemberStatus(pid) {
		if (!pid) {
			return { errCode: 'PARAM_IS_NULL', errMsg: '参数不能为空' }
		}

		// 检查管理员权限（只有管理员才能管理成员）
		const check = await checkIsManager(pid, this.userInfo.uid)
		if (!check.success) {
			return { errCode: 'PERMISSION_DENIED', errMsg: check.error }
		}

		const projectData = check.project
		const members = projectData.members || []
		const managers = projectData.managers || []

		// 获取所有用户
		const users = await db.collection('uni-id-users').field({
			_id: true,
			nickname: true
		}).get()

		if (!users.data || users.data.length === 0) {
			return { members: [], userList: [] }
		}

		// 为每个用户标记是否加入项目及角色
		const userList = users.data.map(user => {
			const isManager = managers.includes(user._id)
			const isMember = members.includes(user._id)
			return {
				...user,
				join_project: isManager || isMember,
				role_in_project: isManager ? '管理员' : (isMember ? '成员' : null)
			}
		})

		return {
			members,
			userList
		}
	},

	/**
	 * 获取项目成员列表
	 *
	 * 功能说明：
	 * - 获取项目所有成员（包括普通成员和管理员）
	 * - 返回成员的基本信息（ID、昵称）
	 * - 按昵称排序
	 *
	 * @param {string} pid - 项目ID
	 * @returns {Array} 成员列表，包含 _id, nickname
	 * @throws {Object} PERMISSION_DENIED - 非项目成员无权访问
	 */
	async getMembersList(pid) {
		if (!pid) {
			return { errCode: 'PARAM_IS_NULL', errMsg: '参数不能为空' }
		}

		// 检查权限
		const check = await checkIsMember(pid, this.userInfo.uid)
		if (!check.success) {
			return { errCode: 'PERMISSION_DENIED', errMsg: check.error }
		}

		const projectData = check.project
		const members = projectData.members || []
		const managers = projectData.managers || []

		if (members.length === 0 && managers.length === 0) {
			return []
		}

		const users = await db.collection('uni-id-users').where({
			_id: dbCmd.in([...new Set([...members, ...managers])])
		}).field({
			_id: true,
			nickname: true
		}).orderBy('nickname', 'asc').get()

		return users.data
	},

	/**
	 * 更新项目信息
	 *
	 * 功能说明：
	 * - 更新项目的基本信息
	 * - 仅允许更新指定字段：name, description, cover, archived, archived_date
	 *
	 * @param {string} projectId - 项目ID
	 * @param {Object} data - 更新数据
	 * @param {string} [data.name] - 项目名称
	 * @param {string} [data.description] - 项目描述
	 * @param {Object} [data.cover] - 项目封面
	 * @param {boolean} [data.archived] - 是否归档
	 * @param {number} [data.archived_date] - 归档时间戳
	 * @returns {Object} { errCode: 0, errMsg: '更新成功' }
	 * @throws {Object} PERMISSION_DENIED - 非项目管理员无权操作
	 */
	async updateProject(projectId, data) {
		if (!projectId) {
			return { errCode: 'PARAM_ERROR', errMsg: '项目ID不能为空' }
		}

		// 检查管理员权限
		const check = await checkIsManager(projectId, this.userInfo.uid)
		if (!check.success) {
			return { errCode: 'PERMISSION_DENIED', errMsg: check.error }
		}

		// 只允许更新特定字段
		const allowedFields = ['name', 'description', 'cover', 'archived', 'archived_date']
		const updateData = {}
		for (const key of allowedFields) {
			if (key in data) {
				updateData[key] = data[key]
			}
		}

		if (Object.keys(updateData).length === 0) {
			return { errCode: 'PARAM_ERROR', errMsg: '没有可更新的字段' }
		}

		try {
			await db.collection('opendb-projects').doc(projectId).update(updateData)
			return { errCode: 0, errMsg: '更新成功' }
		} catch (e) {
			return { errCode: 'UPDATE_FAILED', errMsg: e.message }
		}
	},

	/**
	 * 删除项目
	 *
	 * 功能说明：
	 * - 删除项目及其所有关联数据
	 * - 关联数据包括：任务(opendb-task)、分组(task-group)、日志(opendb-task-logs)
	 * - 此操作不可恢复
	 *
	 * @param {string} projectId - 项目ID
	 * @returns {Object} { errCode: 0, errMsg: '项目已删除' }
	 * @throws {Object} PERMISSION_DENIED - 非项目管理员无权操作
	 */
	async deleteProject(projectId) {
		if (!projectId) {
			return { errCode: 'PARAM_ERROR', errMsg: '项目ID不能为空' }
		}

		// 检查管理员权限
		const check = await checkIsManager(projectId, this.userInfo.uid)
		if (!check.success) {
			return { errCode: 'PERMISSION_DENIED', errMsg: check.error }
		}

		try {
			// 删除项目下的所有任务
			await db.collection('opendb-task').where({
				project_id: projectId
			}).remove()

			// 删除项目下的所有分组
			await db.collection('task-group').where({
				project_id: projectId
			}).remove()

			// 删除项目下的所有日志
			await db.collection('opendb-task-logs').where({
				project_id: projectId
			}).remove()

			// 删除项目本身
			await db.collection('opendb-projects').doc(projectId).remove()

			return { errCode: 0, errMsg: '项目已删除' }
		} catch (e) {
			return { errCode: 'DELETE_FAILED', errMsg: e.message }
		}
	},

	/**
	 * 归档/取消归档项目
	 *
	 * 功能说明：
	 * - 切换项目的归档状态
	 * - 归档后项目从活跃列表中隐藏，但数据保留
	 * - 可随时取消归档恢复到活跃状态
	 *
	 * @param {string} projectId - 项目ID
	 * @returns {Object} { errCode: 0, errMsg: '...', data: { archived: boolean } }
	 * @throws {Object} PERMISSION_DENIED - 非项目管理员无权操作
	 */
	async toggleArchive(projectId) {
		if (!projectId) {
			return { errCode: 'PARAM_ERROR', errMsg: '项目ID不能为空' }
		}

		// 检查管理员权限
		const check = await checkIsManager(projectId, this.userInfo.uid)
		if (!check.success) {
			return { errCode: 'PERMISSION_DENIED', errMsg: check.error }
		}

		const isCurrentlyArchived = check.project.archived || false
		const newArchivedState = !isCurrentlyArchived

		try {
			await db.collection('opendb-projects').doc(projectId).update({
				archived: newArchivedState,
				archived_date: newArchivedState ? Date.now() : null
			})
			return {
				errCode: 0,
				errMsg: newArchivedState ? '项目已归档' : '已取消归档',
				data: { archived: newArchivedState }
			}
		} catch (e) {
			return { errCode: 'UPDATE_FAILED', errMsg: e.message }
		}
	},

	/**
	 * 添加项目成员
	 *
	 * 功能说明：
	 * - 将用户添加为项目的普通成员
	 * - 已是成员或管理员的用户不能重复添加
	 *
	 * @param {string} projectId - 项目ID
	 * @param {string} userId - 要添加的用户ID
	 * @returns {Object} { errCode: 0, errMsg: '成员添加成功' }
	 * @throws {Object} PERMISSION_DENIED - 非项目管理员无权操作
	 * @throws {Object} ALREADY_MEMBER - 用户已是项目成员
	 */
	async addMember(projectId, userId) {
		if (!projectId || !userId) {
			return { errCode: 'PARAM_ERROR', errMsg: '参数不完整' }
		}

		// 检查管理员权限
		const check = await checkIsManager(projectId, this.userInfo.uid)
		if (!check.success) {
			return { errCode: 'PERMISSION_DENIED', errMsg: check.error }
		}

		const members = check.project.members || []
		const managers = check.project.managers || []

		// 检查用户是否已经是成员
		if (members.includes(userId) || managers.includes(userId)) {
			return { errCode: 'ALREADY_MEMBER', errMsg: '该用户已经是项目成员' }
		}

		try {
			await db.collection('opendb-projects').doc(projectId).update({
				members: dbCmd.push(userId)
			})
			return { errCode: 0, errMsg: '成员添加成功' }
		} catch (e) {
			return { errCode: 'ADD_FAILED', errMsg: e.message }
		}
	},

	/**
	 * 移除项目成员
	 *
	 * 功能说明：
	 * - 从项目中移除普通成员
	 * - 管理员不能被移除（需先取消管理员权限）
	 *
	 * @param {string} projectId - 项目ID
	 * @param {string} userId - 要移除的用户ID
	 * @returns {Object} { errCode: 0, errMsg: '成员已移除' }
	 * @throws {Object} PERMISSION_DENIED - 非项目管理员无权操作
	 * @throws {Object} CANNOT_REMOVE_MANAGER - 不能移除管理员
	 */
	async removeMember(projectId, userId) {
		if (!projectId || !userId) {
			return { errCode: 'PARAM_ERROR', errMsg: '参数不完整' }
		}

		// 检查管理员权限
		const check = await checkIsManager(projectId, this.userInfo.uid)
		if (!check.success) {
			return { errCode: 'PERMISSION_DENIED', errMsg: check.error }
		}

		// 不能移除管理员
		if ((check.project.managers || []).includes(userId)) {
			return { errCode: 'CANNOT_REMOVE_MANAGER', errMsg: '不能移除项目管理员' }
		}

		try {
			await db.collection('opendb-projects').doc(projectId).update({
				members: dbCmd.pull(userId)
			})
			return { errCode: 0, errMsg: '成员已移除' }
		} catch (e) {
			return { errCode: 'REMOVE_FAILED', errMsg: e.message }
		}
	},

	/**
	 * 设置/取消管理员权限
	 *
	 * 功能说明：
	 * - 将普通成员提升为管理员，或将管理员降级为普通成员
	 * - 不能更改自己的管理员权限
	 * - 设为管理员时自动从普通成员列表移除
	 * - 取消管理员时自动添加到普通成员列表
	 *
	 * @param {string} projectId - 项目ID
	 * @param {string} userId - 目标用户ID
	 * @param {boolean} isManager - true: 设为管理员, false: 取消管理员
	 * @returns {Object} { errCode: 0, errMsg: '已设为管理员' | '已取消管理员' }
	 * @throws {Object} PERMISSION_DENIED - 非项目管理员无权操作
	 * @throws {Object} CANNOT_CHANGE_SELF - 不能更改自己的权限
	 */
	async toggleManager(projectId, userId, isManager) {
		if (!projectId || !userId) {
			return { errCode: 'PARAM_ERROR', errMsg: '参数不完整' }
		}

		// 检查管理员权限
		const check = await checkIsManager(projectId, this.userInfo.uid)
		if (!check.success) {
			return { errCode: 'PERMISSION_DENIED', errMsg: check.error }
		}

		// 不能操作自己
		if (userId === this.userInfo.uid) {
			return { errCode: 'CANNOT_CHANGE_SELF', errMsg: '不能更改自己的管理员权限' }
		}

		try {
			if (isManager) {
				// 添加为管理员，同时从普通成员中移除
				await db.collection('opendb-projects').doc(projectId).update({
					managers: dbCmd.push(userId),
					members: dbCmd.pull(userId)
				})
			} else {
				// 从管理员移除，添加到普通成员
				await db.collection('opendb-projects').doc(projectId).update({
					managers: dbCmd.pull(userId),
					members: dbCmd.push(userId)
				})
			}
			return { errCode: 0, errMsg: isManager ? '已设为管理员' : '已取消管理员' }
		} catch (e) {
			return { errCode: 'UPDATE_FAILED', errMsg: e.message }
		}
	}
}
