// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
// jsdoc语法提示教程：https://ask.dcloud.net.cn/docs/#//ask.dcloud.net.cn/article/129
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
	_before: async function() {
		// 获取客户端信息和用户信息
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
	 * 获取所有用户及其在项目中的成员状态（用于成员管理页面）
	 * @param {string} pid 项目ID
	 * @returns {Object} { members: string[], userList: Array<{_id, nickname, join_project, role_in_project}> }
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
	 * 获取该项目下的成员列表
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
	 * 删除项目（包括关联的任务、分组、日志）
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
	 * 设置/取消管理员
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
