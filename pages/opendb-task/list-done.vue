<!--
 * 已完成任务列表页面
 *
 * 功能说明：
 * - 展示项目下所有已完成的任务
 * - 任务按完成日期分组显示
 * - 支持按负责人筛选
 * - 显示任务完成时间
 * - 点击任务跳转到任务详情
 *
 * 路由：/pages/opendb-task/list-done?id={projectId}&name={projectName}
-->
<template>
	<view class="container">
		<!-- 自定义导航栏 -->
		<CustomNavBar :title="project_name" subtitle="已完成任务" :backUrl="backUrl">
		</CustomNavBar>

		<!-- 筛选栏 -->
		<view class="filter-bar">
			<view class="filter-item">
				<text class="filter-label">负责人</text>
				<uni-data-select
					v-model="filterAssignee"
					:localdata="memberOptions"
					placeholder="全部"
					@change="handleFilterChange"
					class="filter-select"
				/>
			</view>
			<view class="task-count" v-if="totalCount > 0">
				共 {{ totalCount }} 项
			</view>
		</view>

		<!-- 任务列表 -->
		<view class="task-list-wrapper">
			<!-- 加载中 -->
			<view v-if="loading && tasks.length === 0" class="loading-state">
				<uni-load-more status="loading"></uni-load-more>
			</view>

			<!-- 空状态 -->
			<view v-else-if="!loading && tasks.length === 0" class="empty-state">
				<uni-icons type="checkbox-filled" size="48" color="#42b983"></uni-icons>
				<text class="empty-text">暂无已完成的任务</text>
			</view>

			<!-- 按日期分组的任务列表 -->
			<view v-else class="task-list">
				<block v-for="group in groupedTasks" :key="group.date">
					<!-- 日期分割线 -->
					<view class="date-divider">
						<text class="date-text">{{ formatDateLabel(group.date) }}</text>
						<text class="date-count">{{ group.tasks.length }} 项</text>
					</view>

					<!-- 当天完成的任务 -->
					<view class="date-group">
						<view
							v-for="item in group.tasks"
							:key="item._id"
							class="task-item"
							@click="handleItemClick(item._id)"
						>
							<view class="task-item__check">
								<uni-icons type="checkmarkempty" size="18" color="#42b983"></uni-icons>
							</view>
							<view class="task-item__content">
								<view class="task-header">
									<text class="task-title">{{ item.title }}</text>
								</view>
								<view class="task-meta">
									<view class="task-group" v-if="getGroupName(item.group_id)">
										<uni-icons type="folder" size="12" color="#6c757d"></uni-icons>
										<text>{{ getGroupName(item.group_id) }}</text>
									</view>
									<view class="task-assignee" v-if="getAssigneeName(item.assignee)">
										<uni-icons type="person" size="12" color="#42b983"></uni-icons>
										<text>{{ getAssigneeName(item.assignee) }}</text>
									</view>
									<view class="task-time">
										<uni-icons type="clock" size="12" color="#adb5bd"></uni-icons>
										<text>{{ formatTime(item.completion_date) }}</text>
									</view>
								</view>
							</view>
							<view class="task-item__action" @click.stop="restoreTask(item._id)">
								<uni-icons type="redo" size="18" color="#6c757d"></uni-icons>
							</view>
						</view>
					</view>
				</block>
			</view>

			<!-- 加载更多 -->
			<view v-if="tasks.length > 0" class="load-more-wrapper">
				<uni-load-more :status="loadMoreStatus" @clickLoadMore="loadMore"></uni-load-more>
			</view>
		</view>
	</view>
</template>

<script>
	import CustomNavBar from '@/components/CustomNavBar/CustomNavBar.vue'
	import { formatDateLabel, formatTime } from '@/utils/date.js'

	export default {
		components: {
			CustomNavBar
		},
		data() {
			return {
				project_name: '',
				project_id: '',
				filterAssignee: '',
				memberOptions: [],
				memberMap: {},
				groupMap: {},
				tasks: [],
				totalCount: 0,
				loading: false,
				loadMoreStatus: 'more',
				page: 1,
				pageSize: 20
			}
		},
		computed: {
			// 返回项目任务列表页的URL
			backUrl() {
				if (!this.project_id || !this.project_name) return ''
				return `/pages/opendb-task/list?id=${this.project_id}&name=${encodeURIComponent(this.project_name)}`
			},
			// 按完成日期分组（倒序）
			groupedTasks() {
				if (!this.tasks || this.tasks.length === 0) return []

				// 先分组
				const groups = {}
				this.tasks.forEach(task => {
					const timestamp = task.completion_date || task.create_date
					const date = new Date(timestamp).toISOString().split('T')[0]
					if (!groups[date]) {
						groups[date] = []
					}
					groups[date].push(task)
				})

				// 转换为数组并按日期倒序排列
				return Object.keys(groups)
					.sort((a, b) => b.localeCompare(a))
					.map(date => ({
						date,
						tasks: groups[date]
					}))
			}
		},
		onLoad(event) {
			this.project_id = event.id || ''
			this.project_name = decodeURIComponent(event.name || '')
			this.loadMembers()
			this.loadGroups()
		},
		onShow() {
			if (this.project_id) {
				this.loadTasks(true)
			}
		},
		onPullDownRefresh() {
			this.loadTasks(true).then(() => {
				uni.stopPullDownRefresh()
			})
		},
		onReachBottom() {
			this.loadMore()
		},
		methods: {
			// 加载任务列表
			async loadTasks(clear = false) {
				if (this.loading) return

				if (clear) {
					this.page = 1
					this.tasks = []
				}

				this.loading = true
				this.loadMoreStatus = 'loading'

				try {
					const db = uniCloud.database()
					const dbCmd = db.command

					// 构建查询条件
					let where = {
						project_id: this.project_id,
						status: 2
					}

					if (this.filterAssignee) {
						where.assignee = this.filterAssignee
					}

					// 查询总数
					if (clear) {
						const countRes = await db.collection('opendb-task')
							.where(where)
							.count()
						this.totalCount = countRes.result.total
					}

					// 查询数据，按完成时间倒序
					const { result } = await db.collection('opendb-task')
						.where(where)
						.field('_id,title,assignee,group_id,completion_date,create_date')
						.orderBy('completion_date desc, create_date desc')
						.skip((this.page - 1) * this.pageSize)
						.limit(this.pageSize)
						.get()

					if (clear) {
						this.tasks = result.data
					} else {
						this.tasks = [...this.tasks, ...result.data]
					}

					// 更新加载状态
					if (this.tasks.length >= this.totalCount) {
						this.loadMoreStatus = 'noMore'
					} else {
						this.loadMoreStatus = 'more'
					}
				} catch (e) {
					console.error('加载任务失败:', e)
					uni.showToast({
						title: '加载失败',
						icon: 'none'
					})
				} finally {
					this.loading = false
				}
			},

			// 加载更多
			loadMore() {
				if (this.loadMoreStatus !== 'noMore' && !this.loading) {
					this.page++
					this.loadTasks(false)
				}
			},

			// 加载项目成员
			async loadMembers() {
				try {
					const db = uniCloud.database()
					const dbCmd = db.command

					// 获取项目信息
					const { result: projectResult } = await db.collection('opendb-projects')
						.doc(this.project_id)
						.field('members,managers')
						.get()

					if (projectResult.data.length === 0) return

					const project = projectResult.data[0]
					const memberIds = [
						...(project.members || []),
						...(project.managers || [])
					].filter((id, index, arr) => arr.indexOf(id) === index)

					if (memberIds.length === 0) {
						this.memberOptions = [{ value: '', text: '全部' }]
						return
					}

					// 获取成员信息
					const { result: usersResult } = await db.collection('uni-id-users')
						.where({ _id: dbCmd.in(memberIds) })
						.field('_id,nickname')
						.get()

					// 构建成员映射
					usersResult.data.forEach(user => {
						this.memberMap[user._id] = user.nickname || '未命名用户'
					})

					this.memberOptions = [
						{ value: '', text: '全部' },
						...usersResult.data.map(user => ({
							value: user._id,
							text: user.nickname || '未命名用户'
						}))
					]
				} catch (e) {
					console.error('加载成员失败:', e)
					this.memberOptions = [{ value: '', text: '全部' }]
				}
			},

			// 加载分组信息
			async loadGroups() {
				try {
					const db = uniCloud.database()
					const { result } = await db.collection('task-group')
						.where({ project_id: this.project_id })
						.field('_id,name')
						.get()

					result.data.forEach(group => {
						this.groupMap[group._id] = group.name
					})
				} catch (e) {
					console.error('加载分组失败:', e)
				}
			},

			// 筛选变更
			handleFilterChange() {
				this.loadTasks(true)
			},

			handleItemClick(id) {
				uni.navigateTo({
					url: `/pages/opendb-task/detail?id=${id}&pid=${this.project_id}`
				})
			},

			// 获取负责人名称
			getAssigneeName(assigneeId) {
				if (!assigneeId) return ''
				return this.memberMap[assigneeId] || ''
			},

			// 获取分组名称
			getGroupName(groupId) {
				if (!groupId) return ''
				return this.groupMap[groupId] || ''
			},

			// 格式化日期标签（今天、昨天、具体日期）
			formatDateLabel,

			// 格式化时间（只显示时分）
			formatTime,

			async restoreTask(taskId) {
				uni.showModal({
					title: '恢复任务',
					content: '确定要将此任务恢复为未完成状态吗？',
					success: async (res) => {
						if (res.confirm) {
							try {
								await uniCloud.database().collection('opendb-task').doc(taskId).update({
									status: 0,
									completion_date: null,
									completion_uid: null
								})
								uni.showToast({
									title: '已恢复',
									icon: 'success'
								})
								this.loadTasks(true)
							} catch (e) {
								console.error('恢复任务失败:', e)
								uni.showToast({
									title: '操作失败',
									icon: 'none'
								})
							}
						}
					}
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
.container {
	min-height: 100vh;
	background: linear-gradient(to bottom, #fafdfb, #f7f8fa);
}

/* 筛选栏 */
.filter-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px;
	margin: 16px 16px 0;
	background-color: #ffffff;
	border-radius: 12px;
	box-shadow: 0 2px 8px rgba(66, 185, 131, 0.08);
	position: relative;
	z-index: 20;

	@media screen and (min-width: 768px) {
		margin: 20px 32px 0;
		padding: 16px 20px;
		max-width: 836px;
		margin-left: auto;
		margin-right: auto;
	}
}

.filter-item {
	display: flex;
	align-items: center;
	gap: 8px;
}

.filter-label {
	font-size: 14px;
	color: #6c757d;
	font-weight: 500;
}

.filter-select {
	min-width: 120px;
}

.task-count {
	font-size: 13px;
	color: #6c757d;
}

.task-list-wrapper {
	padding: 16px;

	@media screen and (min-width: 768px) {
		padding: 20px 32px;
		max-width: 900px;
		margin: 0 auto;
	}
}

.task-list {
	background-color: #ffffff;
	border-radius: 12px;
	box-shadow: 0 2px 8px rgba(66, 185, 131, 0.08);
	overflow: hidden;
}

/* 日期分割线 */
.date-divider {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	background: linear-gradient(135deg, #42b983 0%, #359568 100%);
	position: sticky;
	top: 0;
	z-index: 10;

	.date-text {
		font-size: 14px;
		font-weight: 600;
		color: #ffffff;
		letter-spacing: 0.5px;
	}

	.date-count {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.8);
	}

	@media screen and (min-width: 768px) {
		padding: 14px 20px;

		.date-text {
			font-size: 15px;
		}
	}
}

.date-group {
	/* 当天任务的容器 */
}

.task-item {
	display: flex;
	align-items: flex-start;
	padding: 16px;
	border-bottom: 1px solid #f0f0f0;
	cursor: pointer;
	transition: all 0.25s ease;

	&:last-child {
		border-bottom: none;
	}

	&:hover {
		background-color: #f0fdf7;
	}
}

.task-item__check {
	width: 32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: #e6fcf5;
	border-radius: 50%;
	margin-right: 12px;
	flex-shrink: 0;
	margin-top: 2px;
}

.task-item__content {
	flex: 1;
	min-width: 0;
}

.task-header {
	margin-bottom: 8px;
}

.task-title {
	font-size: 15px;
	color: #2c3e50;
	font-weight: 500;
	display: block;
	line-height: 1.5;

	@media screen and (min-width: 768px) {
		font-size: 16px;
	}
}

.task-meta {
	display: flex;
	align-items: center;
	gap: 16px;
	flex-wrap: wrap;
}

.task-group {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 12px;
	color: #6c757d;
}

.task-assignee {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 12px;
	color: #42b983;
}

.task-time {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 12px;
	color: #adb5bd;
}

.task-item__action {
	width: 36px;
	height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 8px;
	margin-left: 8px;
	flex-shrink: 0;
	transition: all 0.25s ease;

	&:hover {
		background-color: #f7f8fa;
	}
}

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

.load-more-wrapper {
	padding: 16px 0;
}

/* 下拉选择器样式优化 */
:deep(.uni-stat__select) {
	min-width: 100px;
}

:deep(.uni-select) {
	border-color: #e9ecef;
	border-radius: 8px;
}

:deep(.uni-select:hover) {
	border-color: #42b983;
}
</style>
