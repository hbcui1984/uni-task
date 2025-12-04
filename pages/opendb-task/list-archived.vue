<!--
 * 已归档分组列表页面
 *
 * 功能说明：
 * - 展示项目下所有已归档的任务分组
 * - 支持查看归档分组中的任务
 * - 支持恢复已归档的分组
 * - 支持删除已归档的分组
 * - 显示分组归档时间和任务数量
 *
 * 路由：/pages/opendb-task/list-archived?id={projectId}&name={projectName}
-->
<template>
	<view class="container">
		<!-- 自定义导航栏（仅移动端显示） -->
		<CustomNavBar v-if="!isWideScreen" :title="project_name" subtitle="已归档清单" :backUrl="backUrl" />

		<!-- PC端页面标题栏 -->
		<view v-else class="pc-page-header">
			<view class="pc-header-left">
				<view class="pc-back-btn" @click="goBack">
					<uni-icons type="left" size="18" color="#42b983"></uni-icons>
				</view>
				<view class="pc-header-title">
					<text class="pc-title">{{ project_name }}</text>
					<text class="pc-subtitle">已归档清单</text>
				</view>
			</view>
		</view>

		<!-- 分组列表 -->
		<view class="group-list-wrapper">
			<!-- 加载中 -->
			<view v-if="loading && groups.length === 0" class="loading-state">
				<uni-load-more status="loading"></uni-load-more>
			</view>

			<!-- 空状态 -->
			<view v-else-if="!loading && groups.length === 0" class="empty-state">
				<uni-icons type="folder" size="48" color="#adb5bd"></uni-icons>
				<text class="empty-text">暂无已归档的分组</text>
				<text class="empty-hint">完成分组下所有任务后，可将分组归档</text>
			</view>

			<!-- 分组列表 -->
			<view v-else class="group-list">
				<view
					v-for="group in groups"
					:key="group._id"
					class="group-item"
					@click="viewGroupTasks(group)"
				>
					<view class="group-item__icon">
						<uni-icons type="folder-add" size="24" color="#6c757d"></uni-icons>
					</view>
					<view class="group-item__content">
						<text class="group-name">{{ group.name }}</text>
						<view class="group-meta">
							<text class="group-task-count">{{ group.taskCount || 0 }} 个任务</text>
							<text class="group-archived-date">归档于 {{ formatDate(group.archived_date) }}</text>
						</view>
					</view>
					<view class="group-item__actions">
						<view class="action-btn" @click.stop="restoreGroup(group)">
							<uni-icons type="redo" size="18" color="#42b983"></uni-icons>
						</view>
						<view class="action-btn action-btn--danger" @click.stop="deleteGroup(group)">
							<uni-icons type="trash" size="18" color="#e74c3c"></uni-icons>
						</view>
					</view>
				</view>
			</view>
		</view>

		<!-- 查看分组任务弹窗 -->
		<uni-popup ref="popup-group-tasks" type="center" background-color="#fff">
			<view class="group-tasks-popup">
				<view class="popup-header">
					<text class="popup-title">{{ currentGroup?.name }}</text>
					<view class="popup-close" @click="closeGroupTasksPopup">
						<uni-icons type="closeempty" size="20" color="#999"></uni-icons>
					</view>
				</view>
				<view class="popup-content">
					<view v-if="groupTasksLoading" class="popup-loading">
						<uni-load-more status="loading"></uni-load-more>
					</view>
					<view v-else-if="groupTasks.length === 0" class="popup-empty">
						<text>该分组下没有任务</text>
					</view>
					<view v-else class="popup-task-list">
						<view
							v-for="task in groupTasks"
							:key="task._id"
							class="popup-task-item"
							@click="viewTaskDetail(task._id)"
						>
							<view class="popup-task-check">
								<uni-icons type="checkmarkempty" size="16" color="#42b983"></uni-icons>
							</view>
							<view class="popup-task-content">
								<text class="popup-task-title">{{ task.title }}</text>
								<text class="popup-task-time">完成于 {{ formatDateTime(task.completion_date) }}</text>
							</view>
						</view>
					</view>
				</view>
			</view>
		</uni-popup>
	</view>
</template>

<script>
	import CustomNavBar from '@/components/CustomNavBar/CustomNavBar.vue'
	import { formatDateCN, formatDateTimeCN } from '@/utils/date.js'
	import { responsiveMixin } from '@/utils/responsive.js'

	export default {
		components: {
			CustomNavBar
		},
		mixins: [responsiveMixin],
		data() {
			return {
				project_name: '',
				project_id: '',
				groups: [],
				loading: false,
				// 分组任务弹窗
				currentGroup: null,
				groupTasks: [],
				groupTasksLoading: false
			}
		},
		computed: {
			backUrl() {
				if (!this.project_id || !this.project_name) return ''
				return `/pages/opendb-task/list?id=${this.project_id}&name=${encodeURIComponent(this.project_name)}`
			}
		},
		onLoad(event) {
			this.project_id = event.id || ''
			this.project_name = decodeURIComponent(event.name || '')
		},
		onShow() {
			if (this.project_id) {
				this.loadArchivedGroups()
			}
		},
		onPullDownRefresh() {
			this.loadArchivedGroups().then(() => {
				uni.stopPullDownRefresh()
			})
		},
		methods: {
			goBack() {
				const pages = getCurrentPages()
				if (pages.length > 1) {
					uni.navigateBack({ delta: 1 })
				} else {
					uni.reLaunch({ url: '/pages/opendb-projects/list' })
				}
			},

			// 加载已归档分组
			async loadArchivedGroups() {
				this.loading = true
				try {
					const db = uniCloud.database()

					// 查询已归档的分组
					const { result } = await db.collection('task-group')
						.where({
							project_id: this.project_id,
							archived: true
						})
						.orderBy('archived_date desc')
						.get()

					this.groups = result.data

					// 加载每个分组的任务数量
					await this.loadGroupTaskCounts()
				} catch (e) {
					console.error('加载已归档分组失败:', e)
					uni.showToast({
						title: '加载失败',
						icon: 'none'
					})
				} finally {
					this.loading = false
				}
			},

			// 加载分组任务数量
			async loadGroupTaskCounts() {
				if (this.groups.length === 0) return

				try {
					const db = uniCloud.database()
					const dbCmd = db.command
					const groupIds = this.groups.map(g => g._id)

					// 查询所有分组的任务
					const { result } = await db.collection('opendb-task')
						.where({
							group_id: dbCmd.in(groupIds)
						})
						.field('_id,group_id')
						.get()

					// 统计每个分组的任务数量
					const countMap = {}
					result.data.forEach(task => {
						if (!countMap[task.group_id]) {
							countMap[task.group_id] = 0
						}
						countMap[task.group_id]++
					})

					// 更新分组数据
					this.groups = this.groups.map(group => ({
						...group,
						taskCount: countMap[group._id] || 0
					}))
				} catch (e) {
					console.error('加载分组任务数量失败:', e)
				}
			},

			// 查看分组任务
			async viewGroupTasks(group) {
				this.currentGroup = group
				this.groupTasks = []
				this.groupTasksLoading = true
				this.$refs['popup-group-tasks'].open()

				try {
					const db = uniCloud.database()
					const { result } = await db.collection('opendb-task')
						.where({
							group_id: group._id
						})
						.field('_id,title,completion_date,status')
						.orderBy('completion_date desc')
						.get()

					this.groupTasks = result.data
				} catch (e) {
					console.error('加载分组任务失败:', e)
					uni.showToast({
						title: '加载失败',
						icon: 'none'
					})
				} finally {
					this.groupTasksLoading = false
				}
			},

			// 关闭分组任务弹窗
			closeGroupTasksPopup() {
				this.$refs['popup-group-tasks'].close()
			},

			// 查看任务详情
			viewTaskDetail(taskId) {
				this.closeGroupTasksPopup()
				uni.navigateTo({
					url: `/pages/opendb-task/detail?id=${taskId}&pid=${this.project_id}`
				})
			},

			// 恢复分组
			restoreGroup(group) {
				uni.showModal({
					title: '恢复分组',
					content: `确定要将「${group.name}」恢复到任务列表吗？`,
					success: async (res) => {
						if (res.confirm) {
							try {
								await uniCloud.database().collection('task-group').doc(group._id).update({
									archived: false,
									archived_date: null
								})
								uni.showToast({
									title: '已恢复',
									icon: 'success'
								})
								this.loadArchivedGroups()
							} catch (e) {
								console.error('恢复分组失败:', e)
								uni.showToast({
									title: '操作失败',
									icon: 'none'
								})
							}
						}
					}
				})
			},

			// 删除分组
			deleteGroup(group) {
				const content = group.taskCount > 0
					? `分组「${group.name}」下有 ${group.taskCount} 个任务，删除分组后这些任务将变为未分组状态。确定删除吗？`
					: `确定要删除分组「${group.name}」吗？`

				uni.showModal({
					title: '删除分组',
					content: content,
					confirmText: '删除',
					confirmColor: '#e74c3c',
					success: async (res) => {
						if (res.confirm) {
							try {
								const db = uniCloud.database()

								// 如果分组下有任务，将任务移至未分组
								if (group.taskCount > 0) {
									await db.collection('opendb-task').where({
										group_id: group._id
									}).update({
										group_id: ''
									})
								}

								// 删除分组
								await db.collection('task-group').doc(group._id).remove()

								uni.showToast({
									title: '已删除',
									icon: 'success'
								})
								this.loadArchivedGroups()
							} catch (e) {
								console.error('删除分组失败:', e)
								uni.showToast({
									title: '操作失败',
									icon: 'none'
								})
							}
						}
					}
				})
			},

			// 格式化日期
			formatDate: formatDateCN,

			// 格式化日期时间
			formatDateTime: formatDateTimeCN
		}
	}
</script>

<style lang="scss" scoped>
.container {
	min-height: 100vh;
	background-color: #f7f8fa;
}

/* PC端页面标题栏 */
.pc-page-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 24px;
	max-width: 900px;
	margin: 0 auto;
}

.pc-header-left {
	display: flex;
	align-items: center;
	gap: 12px;
}

.pc-back-btn {
	width: 36px;
	height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 8px;
	background-color: #e6fcf5;
	cursor: pointer;
	transition: all 0.2s ease;

	&:hover {
		background-color: #d1f7e8;
	}
}

.pc-header-title {
	display: flex;
	flex-direction: column;
}

.pc-title {
	font-size: 18px;
	font-weight: 600;
	color: #2c3e50;
}

.pc-subtitle {
	font-size: 12px;
	color: #6c757d;
	margin-top: 2px;
}

/* 分组列表容器 */
.group-list-wrapper {
	padding: 16px;

	@media screen and (min-width: 768px) {
		padding: 20px 24px;
		max-width: 900px;
		margin: 0 auto;
	}
}

.group-list {
	background-color: #ffffff;
	border-radius: 12px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
	overflow: hidden;
}

.group-item {
	display: flex;
	align-items: center;
	padding: 16px;
	border-bottom: 1px solid #f0f0f0;
	cursor: pointer;
	transition: all 0.25s ease;

	&:last-child {
		border-bottom: none;
	}

	&:hover {
		background-color: #f8f9fa;
	}
}

.group-item__icon {
	width: 48px;
	height: 48px;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: #f7f8fa;
	border-radius: 10px;
	margin-right: 14px;
	flex-shrink: 0;
}

.group-item__content {
	flex: 1;
	min-width: 0;
}

.group-name {
	font-size: 15px;
	font-weight: 600;
	color: #2c3e50;
	display: block;
	margin-bottom: 6px;

	@media screen and (min-width: 768px) {
		font-size: 16px;
	}
}

.group-meta {
	display: flex;
	align-items: center;
	gap: 12px;
}

.group-task-count {
	font-size: 13px;
	color: #42b983;
}

.group-archived-date {
	font-size: 12px;
	color: #adb5bd;
}

.group-item__actions {
	display: flex;
	align-items: center;
	gap: 8px;
	opacity: 0;
	transition: opacity 0.2s ease;
}

.group-item:hover .group-item__actions {
	opacity: 1;
}

.action-btn {
	width: 36px;
	height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 8px;
	background-color: #e6fcf5;
	cursor: pointer;
	transition: all 0.2s ease;

	&:hover {
		background-color: #d1f7e8;
	}
}

.action-btn--danger {
	background-color: #fef2f2;

	&:hover {
		background-color: #fee2e2;
	}
}

/* 空状态和加载状态 */
.loading-state {
	padding: 40px 0;
	background-color: #ffffff;
	border-radius: 12px;
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 80px 20px;
	text-align: center;
	background-color: #ffffff;
	border-radius: 12px;
}

.empty-text {
	margin-top: 16px;
	font-size: 15px;
	color: #6c757d;
}

.empty-hint {
	margin-top: 8px;
	font-size: 13px;
	color: #adb5bd;
}

/* 分组任务弹窗 */
.group-tasks-popup {
	width: 400px;
	max-width: 90vw;
	max-height: 70vh;
	border-radius: 12px;
	overflow: hidden;
	display: flex;
	flex-direction: column;
}

.popup-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 20px;
	background: linear-gradient(135deg, #42b983 0%, #359568 100%);
}

.popup-title {
	font-size: 16px;
	font-weight: 600;
	color: #ffffff;
}

.popup-close {
	width: 28px;
	height: 28px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 6px;
	background-color: rgba(255, 255, 255, 0.2);
	cursor: pointer;

	&:hover {
		background-color: rgba(255, 255, 255, 0.3);
	}
}

.popup-content {
	flex: 1;
	overflow-y: auto;
	padding: 0;
}

.popup-loading,
.popup-empty {
	padding: 40px 20px;
	text-align: center;
	color: #6c757d;
}

.popup-task-list {
	padding: 8px 0;
}

.popup-task-item {
	display: flex;
	align-items: flex-start;
	padding: 12px 20px;
	cursor: pointer;
	transition: background-color 0.2s ease;

	&:hover {
		background-color: #f0fdf7;
	}
}

.popup-task-check {
	width: 28px;
	height: 28px;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: #e6fcf5;
	border-radius: 50%;
	margin-right: 12px;
	flex-shrink: 0;
}

.popup-task-content {
	flex: 1;
	min-width: 0;
}

.popup-task-title {
	font-size: 14px;
	color: #2c3e50;
	display: block;
	margin-bottom: 4px;
}

.popup-task-time {
	font-size: 12px;
	color: #adb5bd;
}
</style>
