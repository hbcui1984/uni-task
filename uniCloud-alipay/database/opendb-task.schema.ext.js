// schema扩展相关文档请参阅：https://uniapp.dcloud.net.cn/uniCloud/jql-schema-ext.html

const db = uniCloud.database();

const taskCache = new Map();

module.exports = {
	trigger: {
		beforeCreate: async function({
			clientInfo,
			userInfo,
			addDataList
		}) {

			const projectId = addDataList[0].project_id
			const userId = userInfo.uid


			const permission = await checkUserInProject(projectId, userId)

			if (!permission) {
				throw new Error('您不在该项目下，无法创建任务')
			}
		},
		afterCreate: async function({
			clientInfo,
			userInfo,
			addDataList,
			result
		}) {

			// result 可能是 { id: 'xxx' } 或 { _id: 'xxx' }
			const taskId = result?.id || result?._id

			if (!taskId) {
				console.error("afterCreate: 无法获取新创建任务的ID", result)
				return
			}

			// 记录任务创建动态
			const isSubTask = !!addDataList[0].parent_id
			const logData = {
				action_type: 'create',
				task_id: taskId,
				project_id: addDataList[0].project_id,
				task_name: addDataList[0].title,
				user_id: userInfo?.uid,
				action_detail: isSubTask
					? `创建了子任务「${addDataList[0].title}」`
					: `创建了任务「${addDataList[0].title}」`,
				create_time: Date.now()
			}

			// 如果是子任务，记录父任务ID，便于查询
			if (addDataList[0].parent_id) {
				logData.parent_task_id = addDataList[0].parent_id
			}

			await db.collection('opendb-task-logs').add(logData)
		},
		// 修改数据触发器
		beforeUpdate: async function({
			clientInfo,
			userInfo,
			where,
			updateData
		}) {

			const taskId = where?._id
			let taskRes
			let pid

			// 如果是通过 _id 更新单个任务
			if (taskId) {
				taskRes = await db.collection('opendb-task').doc(taskId).get()
				if (taskRes.data && taskRes.data.length > 0) {
					pid = taskRes.data[0].project_id
					taskCache.set(taskId, taskRes.data[0])
				}
			} else {
				// 批量更新（如通过 group_id 筛选），查询第一个任务获取项目ID
				taskRes = await db.collection('opendb-task').where(where).limit(1).get()
				if (taskRes.data && taskRes.data.length > 0) {
					pid = taskRes.data[0].project_id
				}
			}

			// 如果能获取到项目ID，检查权限
			if (pid) {
				const permission = await checkUserInProject(pid, userInfo.uid)
				if (!permission) {
					throw new Error('您不在该项目下，无法更新任务')
				}
			}

			// 修改任务状态（仅针对单个任务更新）
			if (taskId && taskRes?.data?.[0] && 'status' in updateData) {
				const oldStatus = taskRes.data[0].status
				if (oldStatus == updateData.status) {
					throw new Error('任务状态异常，请刷新查看')
				}
				//完成任务，需要增加完成人和完成时间
				if (updateData.status == 2) {
					updateData.completion_uid = userInfo.uid
					updateData.completion_date = new Date()
				}
			}

			// 删除附件

			// console.log('updateData',updateData);

			// if('attachments' in updateData){
			// 	console.log("update task attachments");

			// 	const oldAttachments = taskRes.data[0].attachments

			// 	//删除附件
			// 	const delFile = oldAttachments[delFileIndex]
			// 	const deleteRes = await uniCloud.deleteFile({
			// 		fileList: [].push(delFile.file_id)
			// 	})
			// 	console.log("deleteRes",deleteRes);

			// 	//删除delFileIndex字段
			// 	delete updateData.delFileIndex

			// 	console.log("new updateData",updateData);
			// }

		},
		
		afterUpdate:async function({
			clientInfo,
			userInfo,
			where,
			updateData,
			result
		}) {
			// 批量更新时（如更新 group_id），不记录详细日志
			const taskId = where?._id
			if (!taskId) {
				return
			}

			const oldData = taskCache.get(taskId) || {}
			const taskTitle = oldData.title || '未知任务'


			// 构建操作详情
			let actionType = 'update'
			const changes = []

			// 状态映射
			const statusMap = { 0: '未开始', 1: '进行中', 2: '已完成' }
			// 优先级映射
			const priorityMap = { 0: '低', 1: '中', 2: '高' }

			// 检查各字段变化，收集所有变更

			// 1. 状态变化
			if ('status' in updateData && updateData.status !== oldData.status) {
				// 如果是完成任务，使用特殊文案
				if (updateData.status === 2) {
					actionType = 'complete'
					changes.push(`完成了任务`)
				} else if (oldData.status === 2 && updateData.status === 0) {
					// 从已完成改为未开始（重新打开任务）
					changes.push(`重新打开了任务`)
				} else {
					const oldStatus = statusMap[oldData.status] || '未知'
					const newStatus = statusMap[updateData.status] || '未知'
					changes.push(`状态：${oldStatus} → ${newStatus}`)
				}
			}

			// 2. 标题变化
			if ('title' in updateData && updateData.title !== oldData.title) {
				changes.push(`标题：${oldData.title || '无'} → ${updateData.title}`)
			}

			// 3. 内容/描述变化
			if ('content' in updateData && updateData.content !== oldData.content) {
				const oldContent = oldData.content ? (oldData.content.length > 20 ? oldData.content.substring(0, 20) + '...' : oldData.content) : '无'
				const newContent = updateData.content ? (updateData.content.length > 20 ? updateData.content.substring(0, 20) + '...' : updateData.content) : '无'
				changes.push(`描述：${oldContent} → ${newContent}`)
			}

			// 4. 优先级变化
			if ('priority' in updateData && updateData.priority !== oldData.priority) {
				const oldPriority = priorityMap[oldData.priority] || '无'
				const newPriority = priorityMap[updateData.priority] || '无'
				changes.push(`优先级：${oldPriority} → ${newPriority}`)
			}

			// 5. 截止日期变化
			if ('deadline' in updateData && updateData.deadline !== oldData.deadline) {
				const formatDate = (ts) => {
					if (!ts) return '无'
					const d = new Date(ts)
					return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
				}
				changes.push(`截止日期：${formatDate(oldData.deadline)} → ${formatDate(updateData.deadline)}`)
			}

			// 6. 负责人变化
			if ('assignee' in updateData && updateData.assignee !== oldData.assignee) {
				// 查询新旧负责人名称
				let oldAssigneeName = '无'
				let newAssigneeName = '无'

				const userIds = [oldData.assignee, updateData.assignee].filter(Boolean)
				if (userIds.length > 0) {
					const userRes = await db.collection('uni-id-users')
						.where({ _id: db.command.in(userIds) })
						.field({ _id: true, nickname: true })
						.get()

					const userMap = {}
					for (const user of userRes.data || []) {
						userMap[user._id] = user.nickname || '未知用户'
					}

					if (oldData.assignee && userMap[oldData.assignee]) {
						oldAssigneeName = userMap[oldData.assignee]
					}
					if (updateData.assignee && userMap[updateData.assignee]) {
						newAssigneeName = userMap[updateData.assignee]
					}
				}

				changes.push(`负责人：${oldAssigneeName} → ${newAssigneeName}`)
			}

			// 7. 分组变化
			if ('group_id' in updateData && updateData.group_id !== oldData.group_id) {
				changes.push(`分组已变更`)
			}

			// 构建最终的 action_detail
			let actionDetail
			if (changes.length === 0) {
				actionDetail = `更新了任务「${taskTitle}」`
			} else if (changes.length === 1) {
				// 对于完成/重新打开任务，使用更简洁的格式
				if (changes[0] === '完成了任务') {
					actionDetail = `完成了任务「${taskTitle}」`
				} else if (changes[0] === '重新打开了任务') {
					actionDetail = `重新打开了任务「${taskTitle}」`
				} else {
					actionDetail = `更新了任务「${taskTitle}」：${changes[0]}`
				}
			} else {
				actionDetail = `更新了任务「${taskTitle}」：\n${changes.map(c => '• ' + c).join('\n')}`
			}

			// 记录任务更新动态
			const logData = {
				action_type: actionType,
				task_id: oldData._id,
				project_id: oldData.project_id,
				task_name: taskTitle,
				user_id: userInfo?.uid,
				action_detail: actionDetail,
				extra_data: {
					before: oldData,
					after: updateData,
					changes: changes
				},
				create_time: Date.now()
			}

			// 如果是子任务，记录父任务ID，便于查询
			if (oldData.parent_id) {
				logData.parent_task_id = oldData.parent_id
			}

			await db.collection('opendb-task-logs').add(logData)
		},
		
		// 删除数据触发器
		beforeDelete: async function({
			clientInfo,
			userInfo,
			where,
			docId
		}) {
			const uid = userInfo?.uid
			if (!uid) {
				throw new Error('请先登录')
			}

			// 获取要删除的任务信息
			const tasks = await db.collection('opendb-task').where(where).get()
			if (!tasks.data || tasks.data.length === 0) {
				throw new Error('任务不存在')
			}

			// 检查每个要删除的任务的权限
			for (const task of tasks.data) {
				const canDelete = await checkDeletePermission(task, uid)
				if (!canDelete) {
					throw new Error('您没有权限删除该任务，只有项目管理员或任务负责人可以删除')
				}
			}

			// 将任务信息保存到 context 中，供 afterDelete 使用
			this.context = {
				deletedTasks: tasks.data
			}
		},
		
		afterDelete: async function({
			clientInfo,
			userInfo,
			where,
			docId
		}) {
			
			
			
			const {
				deletedTasks
			} = this.context
			
		
			// 为每个被删除的任务记录动态
			for (const task of deletedTasks) {
				const isSubTask = !!task.parent_id
				const logData = {
					action_type: 'delete',
					task_id: task._id,
					project_id: task.project_id,
					task_name: task.title,
					user_id: userInfo?.uid,
					action_detail: isSubTask
						? `删除了子任务「${task.title}」`
						: `删除了任务「${task.title}」`,
					create_time: Date.now()
				}

				// 如果是子任务，记录父任务ID，便于查询
				if (task.parent_id) {
					logData.parent_task_id = task.parent_id
				}

				await db.collection('opendb-task-logs').add(logData)
			}
		}
		
		
	}
}

/**
 * 检查用户是否在该项目下
 */
async function checkUserInProject(pid, uid) {
	if (!pid || !uid) {
		return false
	}

	try {
		// 获取项目信息
		let projectRes = await db.collection('opendb-projects').doc(pid).get()

		if (projectRes?.data?.length > 0) {
			const project = projectRes.data[0]
			const { members, managers } = project

			// 检查用户是否在成员或管理员列表中
			const isMember = members?.includes(uid) === true
			const isManager = managers?.includes(uid) === true

			return isMember || isManager
		}

		return false
	} catch (err) {
		console.error("checkUserInProject error:", err)
		return false
	}
}

/**
 * 检查用户是否有权限删除任务
 * 权限规则：项目管理员 或 任务负责人 可删除
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
		console.error("checkDeletePermission error:", err)
		return false
	}
}