<!--
 * 我的任务页面
 *
 * 功能说明：
 * - 展示当前用户被分配的所有未完成任务
 * - 任务按所属项目分组显示
 * - 支持折叠/展开项目分组
 * - 显示任务截止日期、优先级、逾期状态
 * - 点击任务跳转到任务详情
 *
 * 路由：/pages/opendb-task/myTask
-->
<template>
	<view class="my-task-page">
		<!-- 页面标题 -->
		<view class="page-header">
			<text class="page-title">我的任务</text>
			<text class="task-summary" v-if="totalCount > 0">共 {{ totalCount }} 项待办</text>
		</view>

		<!-- 加载中 -->
		<view v-if="loading" class="loading-container">
			<text class="loading-text">加载中...</text>
		</view>

		<!-- 无任务 -->
		<view v-else-if="!projectList || projectList.length === 0" class="empty-container">
			<uni-icons type="checkbox" size="48" color="#ccc"></uni-icons>
			<text class="empty-text">暂无分配给你的任务</text>
			<text class="empty-hint">当有人将任务分配给你时，会显示在这里</text>
		</view>

		<!-- 任务列表按项目分组 -->
		<view v-else class="project-list">
			<view v-for="project in projectList" :key="project._id" class="project-section">
				<!-- 项目标题 -->
				<view class="project-header" @click="toggleProject(project._id)">
					<view class="project-info">
						<uni-icons :type="expandedProjects[project._id] ? 'bottom' : 'right'" size="16" color="#42b983"></uni-icons>
						<text class="project-name">{{ project.name }}</text>
						<text class="project-count">({{ project.taskCount }})</text>
					</view>
					<view class="project-action" @click.stop="goToProject(project._id, project.name)">
						<uni-icons type="right" size="14" color="#999"></uni-icons>
					</view>
				</view>

				<!-- 项目下的任务分组 -->
				<view v-show="expandedProjects[project._id]" class="task-groups">
					<!-- 未分组的任务 -->
					<view v-if="project.ungroupedTasks && project.ungroupedTasks.length > 0" class="task-group">
						<view class="task-list-custom">
							<template v-for="task in project.ungroupedTasks" :key="task._id">
								<!-- 情况1: 子任务，父任务负责人不是自己 - 显示灰色父任务行 -->
								<view v-if="task.parentTask" class="parent-task-row" @click="goToTaskDetail(task.parentTask._id, project._id)">
									<checkbox disabled class="checkbox-disabled" />
									<view class="task-content">
										<text class="parent-task-title">{{ task.parentTask.title }}</text>
									</view>
									<view class="task-meta">
										<view class="parent-task-assignee">{{ task.parentTask.assigneeName || '无负责人' }}</view>
									</view>
								</view>
								<!-- 情况1的子任务行（缩进） -->
								<view v-if="task.parentTask" class="task-row task-row--child" @click="goToTaskDetail(task._id, project._id)">
									<checkbox @click.stop="finishTask(task._id)" color="#42b983" />
									<view class="task-content">
										<text class="task-title">{{ task.title }}</text>
									</view>
									<view class="task-meta">
										<view v-if="task.deadline" class="deadline" :class="{ 'overdue': isOverdue(task.deadline) }">
											{{ formatDeadline(task.deadline) }}
										</view>
										<text class="priority-tag" :class="`priority-${task.priority || 0}`">
											{{ getPriorityText(task.priority) }}
										</text>
										<view class="assignee">
											<image v-if="userAvatar" :src="userAvatar" class="assignee-avatar" mode="aspectFill"></image>
											<view v-else class="assignee-avatar assignee-avatar-text" :style="{ backgroundColor: getAvatarColor(userNickname) }">
												{{ userNickname.slice(0,1) }}
											</view>
										</view>
									</view>
								</view>
								<!-- 情况2: 父任务（自己负责），正常显示 -->
								<template v-if="!task.parentTask">
									<view class="task-row" @click="goToTaskDetail(task._id, project._id)">
										<checkbox @click.stop="finishTask(task._id)" color="#42b983" />
										<view class="task-content">
											<text class="task-title">{{ task.title }}</text>
										</view>
										<view class="task-meta">
											<view v-if="task.deadline" class="deadline" :class="{ 'overdue': isOverdue(task.deadline) }">
												{{ formatDeadline(task.deadline) }}
											</view>
											<text class="priority-tag" :class="`priority-${task.priority || 0}`">
												{{ getPriorityText(task.priority) }}
											</text>
											<view class="assignee">
												<image v-if="userAvatar" :src="userAvatar" class="assignee-avatar" mode="aspectFill"></image>
												<view v-else class="assignee-avatar assignee-avatar-text" :style="{ backgroundColor: getAvatarColor(userNickname) }">
													{{ userNickname.slice(0,1) }}
												</view>
											</view>
										</view>
									</view>
									<!-- 父任务下的子任务（缩进显示） -->
									<view v-for="child in task.children" :key="child._id" class="task-row task-row--child" @click="goToTaskDetail(child._id, project._id)">
										<checkbox @click.stop="finishTask(child._id)" color="#42b983" />
										<view class="task-content">
											<text class="task-title">{{ child.title }}</text>
										</view>
										<view class="task-meta">
											<view v-if="child.deadline" class="deadline" :class="{ 'overdue': isOverdue(child.deadline) }">
												{{ formatDeadline(child.deadline) }}
											</view>
											<text class="priority-tag" :class="`priority-${child.priority || 0}`">
												{{ getPriorityText(child.priority) }}
											</text>
											<view class="assignee">
												<image v-if="userAvatar" :src="userAvatar" class="assignee-avatar" mode="aspectFill"></image>
												<view v-else class="assignee-avatar assignee-avatar-text" :style="{ backgroundColor: getAvatarColor(userNickname) }">
													{{ userNickname.slice(0,1) }}
												</view>
											</view>
										</view>
									</view>
								</template>
							</template>
						</view>
					</view>

					<!-- 分组的任务 -->
					<view v-for="group in project.groups" :key="group._id" class="task-group">
						<view class="group-header">
							<text class="group-name">{{ group.name }}</text>
							<text class="group-count">({{ group.tasks.length }})</text>
						</view>
						<view class="task-list-custom">
							<template v-for="task in group.tasks" :key="task._id">
								<!-- 情况1: 子任务，父任务负责人不是自己 - 显示灰色父任务行 -->
								<view v-if="task.parentTask" class="parent-task-row" @click="goToTaskDetail(task.parentTask._id, project._id)">
									<checkbox disabled class="checkbox-disabled" />
									<view class="task-content">
										<text class="parent-task-title">{{ task.parentTask.title }}</text>
									</view>
									<view class="task-meta">
										<view class="parent-task-assignee">{{ task.parentTask.assigneeName || '无负责人' }}</view>
									</view>
								</view>
								<!-- 情况1的子任务行（缩进） -->
								<view v-if="task.parentTask" class="task-row task-row--child" @click="goToTaskDetail(task._id, project._id)">
									<checkbox @click.stop="finishTask(task._id)" color="#42b983" />
									<view class="task-content">
										<text class="task-title">{{ task.title }}</text>
									</view>
									<view class="task-meta">
										<view v-if="task.deadline" class="deadline" :class="{ 'overdue': isOverdue(task.deadline) }">
											{{ formatDeadline(task.deadline) }}
										</view>
										<text class="priority-tag" :class="`priority-${task.priority || 0}`">
											{{ getPriorityText(task.priority) }}
										</text>
										<view class="assignee">
											<image v-if="userAvatar" :src="userAvatar" class="assignee-avatar" mode="aspectFill"></image>
											<view v-else class="assignee-avatar assignee-avatar-text" :style="{ backgroundColor: getAvatarColor(userNickname) }">
												{{ userNickname.slice(0,1) }}
											</view>
										</view>
									</view>
								</view>
								<!-- 情况2: 父任务（自己负责），正常显示 -->
								<template v-if="!task.parentTask">
									<view class="task-row" @click="goToTaskDetail(task._id, project._id)">
										<checkbox @click.stop="finishTask(task._id)" color="#42b983" />
										<view class="task-content">
											<text class="task-title">{{ task.title }}</text>
										</view>
										<view class="task-meta">
											<view v-if="task.deadline" class="deadline" :class="{ 'overdue': isOverdue(task.deadline) }">
												{{ formatDeadline(task.deadline) }}
											</view>
											<text class="priority-tag" :class="`priority-${task.priority || 0}`">
												{{ getPriorityText(task.priority) }}
											</text>
											<view class="assignee">
												<image v-if="userAvatar" :src="userAvatar" class="assignee-avatar" mode="aspectFill"></image>
												<view v-else class="assignee-avatar assignee-avatar-text" :style="{ backgroundColor: getAvatarColor(userNickname) }">
													{{ userNickname.slice(0,1) }}
												</view>
											</view>
										</view>
									</view>
									<!-- 父任务下的子任务（缩进显示） -->
									<view v-for="child in task.children" :key="child._id" class="task-row task-row--child" @click="goToTaskDetail(child._id, project._id)">
										<checkbox @click.stop="finishTask(child._id)" color="#42b983" />
										<view class="task-content">
											<text class="task-title">{{ child.title }}</text>
										</view>
										<view class="task-meta">
											<view v-if="child.deadline" class="deadline" :class="{ 'overdue': isOverdue(child.deadline) }">
												{{ formatDeadline(child.deadline) }}
											</view>
											<text class="priority-tag" :class="`priority-${child.priority || 0}`">
												{{ getPriorityText(child.priority) }}
											</text>
											<view class="assignee">
												<image v-if="userAvatar" :src="userAvatar" class="assignee-avatar" mode="aspectFill"></image>
												<view v-else class="assignee-avatar assignee-avatar-text" :style="{ backgroundColor: getAvatarColor(userNickname) }">
													{{ userNickname.slice(0,1) }}
												</view>
											</view>
										</view>
									</view>
								</template>
							</template>
						</view>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { formatDeadline, isOverdue, getPriorityText, getAvatarColor } from '@/utils/task.js'
import { getCurrentUser } from '@/utils/auth.js'

export default {
	data() {
		return {
			loading: true,
			userId: '',
			userNickname: '',
			userAvatar: '',
			projectList: [],
			expandedProjects: {},
			totalCount: 0
		}
	},
	onLoad() {
		const userInfo = getCurrentUser()
		this.userId = userInfo._id
		this.userNickname = userInfo.nickname || '我'
		this.userAvatar = userInfo.avatar_file?.url || ''
		this.loadMyTasks()
	},
	onShow() {
		// 每次显示页面时刷新数据
		if (this.userId) {
			this.loadMyTasks()
		}
	},
	onPullDownRefresh() {
		this.loadMyTasks().finally(() => {
			uni.stopPullDownRefresh()
		})
	},
	methods: {
		async loadMyTasks() {
			if (!this.userId) {
				this.loading = false
				return
			}

			this.loading = true

			try {
				const db = uniCloud.database()
				const dbCmd = db.command

				// 查询分配给当前用户的所有未完成任务
				const { result: taskResult } = await db.collection('opendb-task')
					.where({
						assignee: this.userId,
						status: dbCmd.neq(2) // 未完成的任务
					})
					.field('_id,title,deadline,priority,status,project_id,group_id,parent_id')
					.orderBy('deadline', 'asc')
					.limit(500)
					.get()

				const tasks = taskResult.data || []

				if (tasks.length === 0) {
					this.projectList = []
					this.totalCount = 0
					this.loading = false
					return
				}

				// 获取所有涉及的项目ID
				const projectIds = [...new Set(tasks.map(t => t.project_id).filter(Boolean))]

				// 获取所有涉及的分组ID
				const groupIds = [...new Set(tasks.map(t => t.group_id).filter(Boolean))]

				// 获取所有父任务ID
				const parentIds = [...new Set(tasks.map(t => t.parent_id).filter(Boolean))]

				// 查询项目信息
				let projectMap = {}
				if (projectIds.length > 0) {
					const { result: projectResult } = await db.collection('opendb-projects')
						.where({
							_id: dbCmd.in(projectIds)
						})
						.field('_id,name')
						.get()

					projectResult.data.forEach(p => {
						projectMap[p._id] = p
					})
				}

				// 查询父任务信息
				let parentTaskMap = {}
				if (parentIds.length > 0) {
					const { result: parentResult } = await db.collection('opendb-task')
						.where({
							_id: dbCmd.in(parentIds)
						})
						.field('_id,title,assignee,group_id')
						.get()

					parentResult.data.forEach(p => {
						parentTaskMap[p._id] = p
					})

					// 获取父任务负责人信息
					const parentAssigneeIds = [...new Set(parentResult.data.map(p => p.assignee).filter(Boolean))]
					if (parentAssigneeIds.length > 0) {
						const { result: userResult } = await db.collection('uni-id-users')
							.where({
								_id: dbCmd.in(parentAssigneeIds)
							})
							.field('_id,nickname')
							.get()

						const userMap = {}
						userResult.data.forEach(u => {
							userMap[u._id] = u
						})

						// 将负责人名称添加到父任务
						Object.values(parentTaskMap).forEach(p => {
							if (p.assignee && userMap[p.assignee]) {
								p.assigneeName = userMap[p.assignee].nickname
							}
						})
					}
				}

				// 过滤掉已删除项目的任务（项目不存在于 projectMap 中的任务）
				const validTasks = tasks.filter(task => {
					return task.project_id && projectMap[task.project_id]
				})
				this.totalCount = validTasks.length

				if (validTasks.length === 0) {
					this.projectList = []
					this.loading = false
					return
				}

				// 查询分组信息
				let groupMap = {}
				// 合并任务的分组ID和父任务的分组ID
				const allGroupIds = [...new Set([
					...groupIds,
					...Object.values(parentTaskMap).map(p => p.group_id).filter(Boolean)
				])]
				if (allGroupIds.length > 0) {
					const { result: groupResult } = await db.collection('task-group')
						.where({
							_id: dbCmd.in(allGroupIds)
						})
						.field('_id,name,order')
						.get()

					groupResult.data.forEach(g => {
						groupMap[g._id] = g
					})
				}

				// 按项目组织任务（使用过滤后的有效任务）
				const projectTaskMap = {}

				// 先区分父任务和子任务
				const parentTasks = validTasks.filter(t => !t.parent_id)
				const childTasks = validTasks.filter(t => t.parent_id)

				// 创建父任务ID到子任务的映射
				const parentToChildrenMap = {}
				childTasks.forEach(child => {
					if (!parentToChildrenMap[child.parent_id]) {
						parentToChildrenMap[child.parent_id] = []
					}
					parentToChildrenMap[child.parent_id].push(child)
				})

				// 处理父任务（包含自己分配的子任务）
				parentTasks.forEach(task => {
					const projectId = task.project_id
					if (!projectTaskMap[projectId]) {
						projectTaskMap[projectId] = {
							_id: projectId,
							name: projectMap[projectId].name,
							taskCount: 0,
							ungroupedTasks: [],
							groupedTasks: {}
						}
					}

					projectTaskMap[projectId].taskCount++

					// 挂载子任务
					task.children = parentToChildrenMap[task._id] || []
					// 子任务也计入总数，但不重复添加到列表
					task.children.forEach(() => {
						projectTaskMap[projectId].taskCount++
					})

					// 确定分组
					const effectiveGroupId = task.group_id

					if (effectiveGroupId && groupMap[effectiveGroupId]) {
						const groupId = effectiveGroupId
						if (!projectTaskMap[projectId].groupedTasks[groupId]) {
							projectTaskMap[projectId].groupedTasks[groupId] = {
								_id: groupId,
								name: groupMap[groupId].name,
								order: groupMap[groupId].order || 0,
								tasks: []
							}
						}
						projectTaskMap[projectId].groupedTasks[groupId].tasks.push(task)
					} else {
						projectTaskMap[projectId].ungroupedTasks.push(task)
					}
				})

				// 处理父任务不在列表中的子任务（父任务负责人不是自己）
				childTasks.forEach(task => {
					// 如果父任务已在列表中（负责人是自己），则跳过（已经作为子任务挂载）
					if (parentTasks.find(p => p._id === task.parent_id)) {
						return
					}

					const projectId = task.project_id
					if (!projectTaskMap[projectId]) {
						projectTaskMap[projectId] = {
							_id: projectId,
							name: projectMap[projectId].name,
							taskCount: 0,
							ungroupedTasks: [],
							groupedTasks: {}
						}
					}

					projectTaskMap[projectId].taskCount++

					// 添加父任务信息
					if (parentTaskMap[task.parent_id]) {
						task.parentTask = parentTaskMap[task.parent_id]
					}

					// 确定分组：子任务跟随父任务的分组
					const effectiveGroupId = task.parentTask
						? task.parentTask.group_id
						: task.group_id

					if (effectiveGroupId && groupMap[effectiveGroupId]) {
						const groupId = effectiveGroupId
						if (!projectTaskMap[projectId].groupedTasks[groupId]) {
							projectTaskMap[projectId].groupedTasks[groupId] = {
								_id: groupId,
								name: groupMap[groupId].name,
								order: groupMap[groupId].order || 0,
								tasks: []
							}
						}
						projectTaskMap[projectId].groupedTasks[groupId].tasks.push(task)
					} else {
						projectTaskMap[projectId].ungroupedTasks.push(task)
					}
				})

				// 转换为数组并排序
				this.projectList = Object.values(projectTaskMap).map(project => ({
					...project,
					groups: Object.values(project.groupedTasks).sort((a, b) => (a.order || 0) - (b.order || 0))
				})).sort((a, b) => b.taskCount - a.taskCount) // 按任务数量降序

				// 默认展开所有项目
				this.projectList.forEach(p => {
					if (this.expandedProjects[p._id] === undefined) {
						this.expandedProjects[p._id] = true
					}
				})

			} catch (e) {
				console.error('加载我的任务失败:', e)
				uni.showToast({
					title: '加载失败',
					icon: 'none'
				})
			} finally {
				this.loading = false
			}
		},

		toggleProject(projectId) {
			this.expandedProjects[projectId] = !this.expandedProjects[projectId]
		},

		goToProject(projectId, projectName) {
			uni.navigateTo({
				url: `/pages/opendb-task/list?id=${projectId}&name=${encodeURIComponent(projectName)}`
			})
		},

		goToTaskDetail(taskId, projectId) {
			uni.navigateTo({
				url: `/pages/opendb-task/detail?id=${taskId}&pid=${projectId}`,
				events: {
					refreshTaskList: () => {
						this.loadMyTasks()
					}
				}
			})
		},

		async finishTask(taskId) {
			try {
				await uniCloud.database().collection('opendb-task').doc(taskId).update({
					status: 2
				})
				uni.showToast({
					title: '已完成',
					icon: 'success'
				})
				this.loadMyTasks()
			} catch (e) {
				console.error('完成任务失败:', e)
				uni.showToast({
					title: '操作失败',
					icon: 'none'
				})
			}
		},

		formatDeadline,
		isOverdue,
		getPriorityText,
		getAvatarColor
	}
}
</script>

<style lang="scss" scoped>
.my-task-page {
	min-height: 100vh;
	background: linear-gradient(to bottom, #fafdfb, #f7f8fa);
	padding: 24px;

	@media screen and (min-width: 768px) {
		padding: 32px 48px;
		max-width: 1200px;
		margin: 0 auto;
	}
}

.page-header {
	margin-bottom: 24px;
	display: flex;
	align-items: baseline;
	gap: 12px;
}

.page-title {
	font-size: 24px;
	font-weight: 700;
	color: #2c3e50;

	@media screen and (min-width: 768px) {
		font-size: 28px;
	}
}

.task-summary {
	font-size: 14px;
	color: #6c757d;
}

.loading-container,
.empty-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 80px 20px;
	text-align: center;
}

.loading-text {
	color: #6c757d;
	font-size: 15px;
}

.empty-text {
	margin-top: 16px;
	font-size: 16px;
	color: #6c757d;
}

.empty-hint {
	margin-top: 8px;
	font-size: 13px;
	color: #adb5bd;
}

.project-list {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.project-section {
	background-color: #ffffff;
	border-radius: 12px;
	overflow: hidden;
	box-shadow: 0 2px 8px rgba(66, 185, 131, 0.08);
}

.project-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 20px;
	background: linear-gradient(135deg, #42b983 0%, #359568 100%);
	cursor: pointer;
	transition: all 0.25s ease;
}

.project-header:hover {
	background: linear-gradient(135deg, #3aa876 0%, #2d7d58 100%);
}

.project-info {
	display: flex;
	align-items: center;
	gap: 8px;
}

.project-info :deep(.uni-icons) {
	color: #ffffff !important;
}

.project-name {
	font-size: 16px;
	font-weight: 600;
	color: #ffffff;
}

.project-count {
	font-size: 13px;
	color: rgba(255, 255, 255, 0.8);
}

.project-action {
	padding: 4px;
	border-radius: 4px;
	transition: all 0.25s ease;
}

.project-action :deep(.uni-icons) {
	color: rgba(255, 255, 255, 0.7) !important;
}

.project-action:hover {
	background-color: rgba(255, 255, 255, 0.15);
}

.project-action:hover :deep(.uni-icons) {
	color: #ffffff !important;
}

.task-groups {
	padding: 0;
}

.task-group {
	border-bottom: 1px solid #f1f3f5;
}

.task-group:last-child {
	border-bottom: none;
}

.group-header {
	display: flex;
	align-items: center;
	padding: 10px 20px 10px 32px;
	background-color: #f0fdf7;
	border-left: 3px solid #42b983;
	gap: 6px;
}

.group-name {
	font-size: 14px;
	font-weight: 600;
	color: #2c3e50;
}

.group-count {
	font-size: 12px;
	color: #6c757d;
}

.task-list {
	background-color: transparent;
	padding-left: 24px;
}

.task-content {
	flex: 1;
	min-width: 0;
}

.task-title-row {
	display: flex;
	align-items: center;
	gap: 8px;
}

.priority-tag {
	padding: 2px 0;
	font-size: 11px;
	font-weight: 500;
	white-space: nowrap;
	flex-shrink: 0;
}

.priority-0 {
	color: #6c757d;
}

.priority-1 {
	color: #42b983;
}

.priority-2 {
	color: #f39c12;
}

.priority-3 {
	color: #e74c3c;
	font-weight: 600;
}

.task-title {
	font-size: 14px;
	color: #2c3e50;
	line-height: 1.5;
	font-weight: 500;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.task-meta {
	display: flex;
	align-items: center;
	gap: 8px;
}

.deadline {
	font-size: 12px;
	color: #6c757d;
	padding: 4px 10px;
	border-radius: 6px;
	background-color: #f7f8fa;
	white-space: nowrap;
}

.deadline.overdue {
	color: #e74c3c;
	background-color: #fdecea;
}

/* 列表项样式优化 */
:deep(.uni-list-item) {
	transition: all 0.25s ease;
}

:deep(.uni-list-item:hover) {
	background-color: #f0fdf7;
}

/* Checkbox 样式优化 */
:deep(checkbox .uni-checkbox-input) {
	border-color: #42b983;
}

:deep(checkbox .uni-checkbox-input.uni-checkbox-input-checked) {
	background-color: #42b983;
	border-color: #42b983;
}

/* 自定义任务列表 */
.task-list-custom {
	padding-left: 24px;
}

/* 父任务行样式 */
.parent-task-row {
	display: flex;
	align-items: center;
	padding: 10px 16px 10px 0;
	cursor: pointer;
	transition: all 0.2s ease;
	border-bottom: 1px solid #f1f3f5;
}

.parent-task-row:hover {
	background-color: #f8f9fa;
}

/* 灰色禁用的 checkbox */
.checkbox-disabled {
	opacity: 0.4;
	pointer-events: none;
}

.parent-task-title {
	font-size: 14px;
	color: #999;
	line-height: 1.5;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.parent-task-meta {
	display: flex;
	align-items: center;
	margin-left: 12px;
}

.parent-task-assignee {
	font-size: 12px;
	color: #adb5bd;
	padding: 4px 10px;
	border-radius: 6px;
	background-color: #f7f8fa;
	white-space: nowrap;
}

/* 任务行样式 */
.task-row {
	display: flex;
	align-items: center;
	padding: 10px 16px 10px 0;
	cursor: pointer;
	transition: all 0.2s ease;
	border-bottom: 1px solid #f1f3f5;
}

.task-row:hover {
	background-color: #f0fdf7;
}

.task-row:last-child {
	border-bottom: none;
}

/* 子任务缩进样式 */
.task-row--child {
	padding-left: 24px;
	background-color: #fafdfb;
}

.task-row--child:hover {
	background-color: #f0fdf7;
}

/* 负责人头像样式 */
.assignee {
	display: flex;
	align-items: center;
	margin-left: 8px;
}

.assignee-avatar {
	width: 24px;
	height: 24px;
	border-radius: 50%;
	flex-shrink: 0;
}

.assignee-avatar-text {
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 12px;
	color: #fff;
	font-weight: 500;
}
</style>
