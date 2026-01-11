<!--
 * 项目任务列表页面
 *
 * 功能说明：
 * - 展示项目下所有未完成任务，按分组归类显示
 * - 支持新建任务、新建分组
 * - 支持按负责人、优先级筛选任务
 * - 支持快捷操作：完成任务、修改负责人/截止日期/优先级
 * - 响应式布局，适配移动端和PC端
 * - 提供项目菜单入口（设置、已完成、已归档等）
 *
 * 路由：/pages/opendb-task/list?id={projectId}&name={projectName}
-->
<template>
	<view class="container">
		<!-- 自定义导航栏（仅移动端显示） -->
		<CustomNavBar v-if="!isWideScreen" :title="project_name" subtitle="任务管理">
			<template #right>
				<view class="nav-action-btn" @click="openProjectMenu">
					<uni-icons type="more-filled" size="20" color="#42b983"></uni-icons>
				</view>
			</template>
		</CustomNavBar>

		<!-- PC端页面标题栏 -->
		<view v-else class="pc-page-header">
			<view class="pc-header-left">
				<view class="pc-back-btn" @click="goBack">
					<uni-icons type="left" size="18" color="#42b983"></uni-icons>
				</view>
				<view class="pc-header-title">
					<text class="pc-title">{{ project_name }}</text>
					<text class="pc-subtitle">任务管理</text>
				</view>
			</view>
			<view class="pc-header-right">
				<view class="nav-action-btn" @click="openProjectMenu">
					<uni-icons type="more-filled" size="20" color="#42b983"></uni-icons>
				</view>
			</view>
		</view>

		<!-- 任务操作栏 - PC端完整版 -->
		<view class="task-actions" v-if="isWideScreen">
			<view class="task-actions__left">
				<view class="task-label">任务</view>
				<view class="task-btns">
					<button type="primary" @click="addTask()" class="add-task-btn" size="mini">
						<uni-icons type="plusempty" size="12" color="#42b983"></uni-icons>
						<text>任务</text>
					</button>
					<button type="default" @click="addGroup" class="add-group-btn" size="mini">
						<uni-icons type="folder-add" size="12" color="#fff"></uni-icons>
						<text>分组</text>
					</button>
				</view>
			</view>
			<view
				class="filter-trigger"
				:class="{ 'filter-trigger--active': hasActiveFilter }"
				@click="openFilterPopup"
			>
				<uni-icons type="settings" size="18" color="#fff"></uni-icons>
				<view v-if="hasActiveFilter" class="filter-badge"></view>
			</view>
		</view>

		<!-- 移动端精简操作栏 -->
		<view class="mobile-task-header" v-else>
			<view class="mobile-task-label">
				<text>任务列表</text>
				<text class="task-total-count" v-if="taskList.length">({{ taskList.length }})</text>
			</view>
			<view class="mobile-header-actions">
				<view
					class="mobile-filter-btn"
					:class="{ 'mobile-filter-btn--active': hasActiveFilter }"
					@click="openFilterPopup"
				>
					<uni-icons type="settings" size="18" :color="hasActiveFilter ? '#42b983' : '#6c757d'"></uni-icons>
				</view>
				<!-- #ifdef MP -->
				<view class="mobile-menu-btn" @click="openProjectMenu">
					<uni-icons type="more-filled" size="18" color="#6c757d"></uni-icons>
				</view>
				<!-- #endif -->
			</view>
		</view>

		<!-- 筛选弹出层 -->
		<uni-popup ref="popup-filter" type="center" background-color="#fff">
			<view class="filter-popup">
				<view class="filter-popup__header">
					<text class="filter-popup__title">筛选条件</text>
					<view class="filter-popup__close" @click="closeFilterPopup">
						<uni-icons type="closeempty" size="20" color="#999"></uni-icons>
					</view>
				</view>
				<view class="filter-popup__content">
					<view class="filter-popup__item">
						<text class="filter-popup__label">负责人</text>
						<uni-data-select
							v-model="filterAssignee"
							:localdata="assigneeOptions"
							placeholder="全部"
							class="filter-popup__select"
						/>
					</view>
					<view class="filter-popup__item">
						<text class="filter-popup__label">优先级</text>
						<uni-data-select
							v-model="filterPriority"
							:localdata="priorityOptions"
							placeholder="全部"
							class="filter-popup__select"
						/>
					</view>
				</view>
				<view class="filter-popup__footer">
					<button class="filter-popup__btn filter-popup__btn--reset" @click="clearFilters">重置</button>
					<button class="filter-popup__btn filter-popup__btn--confirm" @click="applyFilter">确定</button>
				</view>
			</view>
		</uni-popup>
		
		<!-- 任务列表组件 -->
		<view v-if="taskError" class="error-message">{{ taskError }}</view>
		<view v-else-if="taskLoading" class="loading-state">
			<uni-load-more status="loading"></uni-load-more>
		</view>
		<view v-else>
			<TaskList
				:tasks="taskList"
				:groups="groupList"
				:members="members"
				:hasFilter="hasActiveFilter"
				@task-click="handleTaskClick"
				@finish-task="finishTask"
				@set-assignee="handleSetAssignee"
				@save-deadline="setDeadline"
				@open-deadline-picker="openDeadlinePopup"
				@edit-group="openEditGroupPopup"
				@archive-group="archiveGroup"
				@delete-group="deleteGroup"
				@delete-task="deleteTask"
				@edit-task="editTask"
				@change-priority="handlePriorityChange"
				@add-task="addTask"
			/>
		</view>

		<!-- 底部快捷链接 -->
		<view class="bottom-links">
			<view class="bottom-link" @click="goToArchivedGroups">
				<uni-icons type="folder" size="16" color="#6c757d"></uni-icons>
				<text>已归档清单</text>
			</view>
			<view class="bottom-link" @click="goToCompletedTasks">
				<uni-icons type="checkmarkempty" size="16" color="#42b983"></uni-icons>
				<text>已完成任务</text>
			</view>
		</view>

		<!-- 移动端悬浮添加按钮 FAB -->
		<uni-fab
			v-if="!isWideScreen"
			class="mobile-fab"
			horizontal="right"
			vertical="bottom"
			:pop-menu="false"
			:pattern="fabPattern"
			@fabClick="showMobileAddMenu"
		/>

		<!-- 设置负责人弹出层 -->
		<uni-popup ref="popup-assignee-set" type="center" background-color="#fff">
			<view class="assignee-popup">
				<view class="popup-title">设置任务负责人</view>
				<view class="popup-content">
					<uni-data-select 
						style="width: 150px;min-height: 100px;" 
						:clear-icon="false"
						v-model="currentTaskAssignee" 
						:localdata="members">
					</uni-data-select>
				</view>
				<view class="popup-buttons">
					<button type="primary" class="uni-button" @click="setAssignee()">确定</button>
					<button type="default" class="uni-button" @click="cancelAssign()">取消</button>
				</view>
			</view>
		</uni-popup>

		<!-- 隐藏的日期选择器 -->
		<picker 
			ref="datePicker"
			mode="date" 
			:value="currentTaskDeadline"
			@change="onMobileDeadlineChange"
			style="position: absolute; left: -9999px; opacity: 0;"
		>
			<view>隐藏的日期选择器</view>
		</picker>

		<!-- 新增分组弹出层 -->
		<uni-popup ref="popup-add-group" type="center" background-color="#fff">
			<view class="group-popup">
				<view class="group-popup__title">新增任务分组</view>
				<view class="group-popup__content">
					<uni-forms>
						<uni-forms-item label="分组名称">
							<uni-easyinput v-model="newGroup.name" placeholder="请输入分组名称" />
						</uni-forms-item>
						<uni-forms-item label="排序">
							<uni-easyinput type="number" v-model="newGroup.order" placeholder="请输入排序号" />
						</uni-forms-item>
					</uni-forms>
				</view>
				<view class="group-popup__buttons">
					<button type="primary" @click="confirmAddGroup">确定</button>
					<button type="default" @click="cancelAddGroup">取消</button>
				</view>
			</view>
		</uni-popup>

		<!-- 编辑分组弹出层 -->
		<uni-popup ref="popup-edit-group" type="center" background-color="#fff">
			<view class="group-popup">
				<view class="group-popup__title">编辑任务分组</view>
				<view class="group-popup__content">
					<uni-forms>
						<uni-forms-item label="分组名称">
							<uni-easyinput v-model="editGroup.name" placeholder="请输入分组名称" />
						</uni-forms-item>
						<uni-forms-item label="排序">
							<uni-easyinput type="number" v-model="editGroup.order" placeholder="请输入排序号" />
						</uni-forms-item>
					</uni-forms>
				</view>
				<view class="group-popup__buttons">
					<button type="primary" @click="confirmEditGroup">确定</button>
					<button type="default" @click="cancelEditGroup">取消</button>
				</view>
			</view>
		</uni-popup>

		<!-- 任务快速编辑组件（优先级、截止日期） -->
		<TaskQuickEdit ref="quickEdit" @update="onQuickEditUpdate" />
	</view>
</template>

<script>
	import CustomNavBar from '@/components/CustomNavBar/CustomNavBar.vue'
	import TaskList from '@/components/TaskList/TaskList.vue'
	import TaskQuickEdit from '@/components/TaskQuickEdit/TaskQuickEdit.vue'
	import errorHandler from '@/utils/errorHandler.js'
	import performanceUtils from '@/utils/performance.js'
	import { responsiveMixin } from '@/utils/responsive.js'

	const projectObj = uniCloud.importObject('project-co')

	export default {
		components: {
			CustomNavBar,
			TaskList,
			TaskQuickEdit
		},
		mixins: [responsiveMixin],
		data() {
			return {
				// uni-fab 样式配置
				fabPattern: {
					buttonColor: '#42b983',
					iconColor: '#fff'
				},
				project_name: '',
				project_id: '',
				taskList: [],
				groupList: [],
				taskLoading: false,
				taskError: null,
				needRefresh: false,
				loadMore: {
					contentdown: '',
					contentrefresh: '',
					contentnomore: ''
				},
				currentTaskId: '',
				currentTaskAssignee: '',
				currentTaskDeadline: '',
				members: [],
				newGroup: {
					name: '',
					order: 0
				},
				editGroup: {
					_id: '',
					name: '',
					order: 0
				},
				// 筛选相关
				filterAssignee: '',
				filterPriority: '',
				priorityOptions: [
					{ value: '', text: '全部' },
					{ value: 0, text: '较低' },
					{ value: 1, text: '普通' },
					{ value: 2, text: '较高' },
					{ value: 3, text: '最高' }
				]
			}
		},
		computed: {
			assigneeOptions() {
				return [
					{ value: '', text: '全部' },
					...this.members
				]
			},
			hasActiveFilter() {
				// 注意：filterPriority 可以是 0（较低），不能直接用 !! 判断
				return !!(this.filterAssignee || this.filterPriority !== '')
			}
		},
		onLoad(event) {
			this.project_id = event.id
			this.project_name = event.name || ''

			// 如果有项目名称则设置标题，否则从数据库加载
			if (this.project_name) {
				uni.setNavigationBarTitle({
					title: this.project_name
				})
			} else {
				this.loadProjectInfo()
			}

			// 加载项目成员
			this.loadProjectMembers()

			// 加载任务数据
			this.$nextTick(() => {
				if (this.project_id) {
					this.loadTaskList()
				}
			})
		},
		onShow() {
			// 只有标记了需要刷新时才刷新（从新增/编辑页面返回时）
			if (this.needRefresh && this.project_id) {
				this.loadTaskList()
				this.needRefresh = false
			}
		},
		onHide() {
			// 页面隐藏时标记需要刷新（可能去了新增/编辑页面）
			this.needRefresh = true
		},
		onPullDownRefresh() {
			this.loadTaskList().then(() => {
				uni.stopPullDownRefresh()
			})
		},
		methods: {
			// 返回上一页
			goBack() {
				const pages = getCurrentPages()
				if (pages.length > 1) {
					uni.navigateBack({ delta: 1 })
				} else {
					uni.reLaunch({ url: '/pages/opendb-projects/list' })
				}
			},

			// 获取任务的分组ID（兼容联表查询数组和字符串两种格式）
			getTaskGroupId(task) {
				if (!task.group_id) return null
				// 联表查询结果是数组
				if (Array.isArray(task.group_id) && task.group_id.length > 0) {
					return task.group_id[0]._id
				}
				// 直接存储的字符串ID
				if (typeof task.group_id === 'string' && task.group_id) {
					return task.group_id
				}
				return null
			},

			// 加载任务列表（使用传统 API 替代 unicloud-db + getTemp）
			async loadTaskList() {
				if (!this.project_id) return

				this.taskLoading = true
				this.taskError = null

				try {
					const db = uniCloud.database()
					const dbCmd = db.command
					const projectId = String(this.project_id)

					// 构建查询条件
					const whereCondition = {
						project_id: projectId,
						status: dbCmd.neq(2),
						// 排除子任务
						parent_id: dbCmd.exists(false).or(dbCmd.eq('').or(dbCmd.eq(null)))
					}

					// 负责人筛选
					if (this.filterAssignee) {
						whereCondition.assignee = this.filterAssignee
					}

					// 优先级筛选
					if (this.filterPriority !== '') {
						whereCondition.priority = this.filterPriority
					}

					// 查询任务列表
					const { result } = await db.collection('opendb-task')
						.where(whereCondition)
						.field('_id,title,content,assignee,group_id,deadline,order,priority')
						.orderBy('order', 'asc')
						.get()

					let tasks = result.data || []

					// 获取所有需要查询的 assignee ID
					const assigneeIds = [...new Set(tasks.map(t => t.assignee).filter(Boolean))]

					// 批量查询负责人信息
					if (assigneeIds.length > 0) {
						const { result: userResult } = await db.collection('uni-id-users')
							.where({ _id: dbCmd.in(assigneeIds) })
							.field('_id,nickname')
							.get()

						const userMap = {}
						userResult.data.forEach(u => {
							userMap[u._id] = u
						})

						// 将 assignee 转换为数组格式（兼容原有模板）
						tasks = tasks.map(task => ({
							...task,
							assignee: task.assignee && userMap[task.assignee]
								? [{ _id: task.assignee, nickname: userMap[task.assignee].nickname }]
								: []
						}))
					} else {
						tasks = tasks.map(task => ({ ...task, assignee: [] }))
					}

					// 获取所有需要查询的 group_id
					const groupIds = [...new Set(tasks.map(t => t.group_id).filter(Boolean))]

					// 批量查询分组信息
					if (groupIds.length > 0) {
						const { result: groupResult } = await db.collection('task-group')
							.where({ _id: dbCmd.in(groupIds) })
							.field('_id,name,order')
							.get()

						const groupMap = {}
						groupResult.data.forEach(g => {
							groupMap[g._id] = g
						})

						// 将 group_id 转换为数组格式（兼容原有模板）
						tasks = tasks.map(task => ({
							...task,
							group_id: task.group_id && groupMap[task.group_id]
								? [groupMap[task.group_id]]
								: []
						}))
					} else {
						tasks = tasks.map(task => ({ ...task, group_id: [] }))
					}

					// 按分组排序
					tasks.sort((a, b) => {
						const aGroupOrder = a.group_id?.[0]?.order ?? 999999
						const bGroupOrder = b.group_id?.[0]?.order ?? 999999
						if (aGroupOrder !== bGroupOrder) {
							return aGroupOrder - bGroupOrder
						}
						return (a.order ?? 0) - (b.order ?? 0)
					})

					this.taskList = tasks

					// 加载分组和子任务统计
					await this.loadGroups()
					await this.loadSubtaskCounts()
				} catch (e) {
					console.error('加载任务列表失败:', e)
					this.taskError = e.message || '加载失败'
				} finally {
					this.taskLoading = false
				}
			},

			// 数据加载处理
			async dataLoadHandle(data, ended, pagination) {
				this.taskList = data;
				await this.loadGroups();
				// 加载子任务统计
				await this.loadSubtaskCounts();
			},

			// 加载子任务统计
			async loadSubtaskCounts() {
				if (!this.taskList || this.taskList.length === 0) return;

				try {
					const db = uniCloud.database();
					const dbCmd = db.command;
					const taskIds = this.taskList.map(t => t._id);

					// 查询所有子任务
					const { result } = await db.collection('opendb-task')
						.where({
							parent_id: dbCmd.in(taskIds)
						})
						.field('_id,parent_id,status')
						.get();

					// 按父任务ID分组统计
					const subtaskMap = {};
					result.data.forEach(subtask => {
						if (!subtaskMap[subtask.parent_id]) {
							subtaskMap[subtask.parent_id] = { total: 0, completed: 0 };
						}
						subtaskMap[subtask.parent_id].total++;
						if (subtask.status === 2) {
							subtaskMap[subtask.parent_id].completed++;
						}
					});

					// 更新任务列表，添加子任务统计
					this.taskList = this.taskList.map(task => ({
						...task,
						subtaskCount: subtaskMap[task._id] || null
					}));
				} catch (e) {
					console.error('加载子任务统计失败:', e);
				}
			},

			// 加载分组数据
			async loadGroups() {
				try {
					const db = uniCloud.database();
					const dbCmd = db.command;
					const { result } = await db.collection('task-group')
						.where({
							project_id: this.project_id,
							archived: dbCmd.neq(true)
						})
						.orderBy('order asc')
						.get();

					this.groupList = result.data;
				} catch (e) {
					errorHandler.handleError(e, { showToast: true })
				}
			},

			// 筛选变化处理
			handleFilterChange() {
				this.$nextTick(() => {
					this.loadTaskList()
				})
			},

			// 打开筛选弹出层
			openFilterPopup() {
				this.$refs['popup-filter'].open()
			},

			// 关闭筛选弹出层
			closeFilterPopup() {
				this.$refs['popup-filter'].close()
			},

			// 应用筛选
			applyFilter() {
				this.closeFilterPopup()
				this.handleFilterChange()
			},

			// 清除筛选
			clearFilters() {
				this.filterAssignee = ''
				this.filterPriority = ''
				this.closeFilterPopup()
				this.handleFilterChange()
			},

			// 加载项目成员
			async loadProjectMembers() {
				try {
					const res = await projectObj.getMembersList(this.project_id)
					this.members = res.map(member => ({
						value: member._id,
						text: member.nickname,
						avatar: member.avatar // 添加头像字段
					}));
				} catch (e) {
					errorHandler.handleError(e, { showToast: true })
				}
			},

			// 任务点击处理
			handleTaskClick(taskId) {
				uni.navigateTo({
					url: `/pages/opendb-task/detail?id=${taskId}&pid=${this.project_id}`
				})
			},

			// 完成任务
			async finishTask(taskId) {
				try {
					const taskObj = uniCloud.importObject('task-co')
					const res = await taskObj.changeState(taskId, 2)

					// 检查返回结果
					if (res.errCode && res.errCode !== 0) {
						throw new Error(res.errMsg || '操作失败')
					}

					// 从本地列表移除已完成的任务
					const taskIndex = this.taskList.findIndex(task => task._id === taskId)
					if (taskIndex !== -1) {
						this.taskList.splice(taskIndex, 1)
					}

					uni.showToast({
						title: '任务已完成',
						icon: 'success'
					})
				} catch (error) {
					console.error('完成任务失败:', error)
					errorHandler.handleError(error, { showToast: true })
				}
			},

			// 删除任务
			deleteTask(taskId) {
				// 先找到任务信息
				const task = this.taskList.find(t => t._id === taskId)
				const taskName = task?.title || '未知任务'

				uni.showModal({
					title: '删除确认',
					content: `确定要删除任务"${taskName}"吗？此操作不可恢复。`,
					confirmText: '删除',
					confirmColor: '#e74c3c',
					success: (res) => {
						if (res.confirm) {
							this.doDeleteTask(taskId, taskName)
						}
					}
				})
			},

			// 执行删除任务（分离 async 逻辑确保错误正确捕获）
			async doDeleteTask(taskId, taskName) {
				try {
					const taskObj = uniCloud.importObject('task-co', { customUI: true })
					const result = await taskObj.deleteTask({
						taskId: taskId,
						taskName: taskName,
						project_id: this.project_id
					})

					// 检查返回结果（云对象可能返回错误而非抛出）
					if (result.errCode) {
						uni.showToast({
							title: result.errMsg || '删除失败',
							icon: 'none',
							duration: 3000
						})
						return
					}

					// 从本地列表移除
					const taskIndex = this.taskList.findIndex(t => t._id === taskId)
					if (taskIndex !== -1) {
						this.taskList.splice(taskIndex, 1)
					}

					uni.showToast({
						title: '删除成功',
						icon: 'success'
					})
				} catch (error) {
					// uniCloud 抛出的错误可能在 error.message 或 error.errMsg 中
					const errMsg = error.errMsg || error.message || '删除失败'
					uni.showToast({
						title: errMsg,
						icon: 'none',
						duration: 3000
					})
				}
			},

			// 编辑任务
			editTask(taskId) {
				uni.navigateTo({
					url: `/pages/opendb-task/edit?id=${taskId}&project_id=${this.project_id}`
				})
			},

			// 处理设置负责人（内联下拉选择）- 乐观更新
			handleSetAssignee({ taskId, memberId }) {
				const taskIndex = this.taskList.findIndex(task => task._id === taskId)
				if (taskIndex === -1) return

				// 保存旧值用于回滚
				const oldAssignee = this.taskList[taskIndex].assignee

				// 乐观更新 UI
				if (memberId) {
					const member = this.members.find(m => m.value === memberId)
					this.taskList[taskIndex].assignee = [{
						_id: memberId,
						nickname: member?.text || '未知'
					}]
				} else {
					this.taskList[taskIndex].assignee = []
				}

				uni.showToast({
					title: memberId ? '设置成功' : '已移除负责人',
					icon: 'success'
				})

				// 后台同步到服务器
				const db = uniCloud.database()
				db.collection('opendb-task').doc(taskId).update({
					assignee: memberId || ''
				}).catch(error => {
					// 失败时回滚
					this.taskList[taskIndex].assignee = oldAssignee
					uni.showToast({
						title: '更新失败，已恢复',
						icon: 'none'
					})
					console.error('更新负责人失败:', error)
				})
			},

			// 打开负责人设置弹窗（保留作为备用）
			openAssigneePopup(taskId) {
				this.currentTaskId = taskId
				this.currentTaskAssignee = ''
				this.$refs['popup-assignee-set'].open()
			},

			// 打开移动端日期选择器
			openDeadlinePopup(taskId, currentDeadline) {
				this.currentTaskId = taskId
				const currentDate = currentDeadline ? new Date(currentDeadline).toISOString().split('T')[0] : ''
				
				// 设置当前日期
				this.currentTaskDeadline = currentDate
				
				// 直接触发隐藏的picker
				this.$nextTick(() => {
					// 模拟点击隐藏的picker
					const pickerElement = this.$refs.datePicker
					if (pickerElement) {
						// 在移动端，直接触发picker的显示
						pickerElement.$el && pickerElement.$el.click()
					}
				})
			},

			// 设置负责人
			async setAssignee() {
				if (!this.currentTaskAssignee) {
					uni.showToast({
						title: '请选择负责人',
						icon: 'none'
					})
					return
				}

				try {
					const db = uniCloud.database()
					await db.collection('opendb-task').doc(this.currentTaskId).update({
						assignee: this.currentTaskAssignee
					})

					// 更新本地数据
					const taskIndex = this.taskList.findIndex(task => task._id === this.currentTaskId)
					if (taskIndex !== -1) {
						this.taskList[taskIndex].assignee = [{
							_id: this.currentTaskAssignee,
							nickname: this.members.find(m => m.value === this.currentTaskAssignee)?.text
						}]
					}

					this.$refs['popup-assignee-set'].close()
					uni.showToast({
						title: '设置成功',
						icon: 'success'
					})
				} catch (error) {
					errorHandler.handleError(error, { showToast: true })
				}
			},

			// 取消设置负责人
			cancelAssign() {
				this.$refs['popup-assignee-set'].close()
			},

			// 移动端日期变化处理
			onMobileDeadlineChange(e) {
				this.currentTaskDeadline = e.detail.value
				// 直接保存选择的日期
				this.saveDeadline(e.detail.value)
			},

			// 保存截止日期
			async saveDeadline(value) {
				try {
					const db = uniCloud.database()
					const deadline = value ? new Date(value).getTime() : null
					
					const start = new Date().getTime();
					
					await db.collection('opendb-task').doc(this.currentTaskId).update({
						deadline: deadline
					})
					

					// 更新本地数据
					const taskIndex = this.taskList.findIndex(task => task._id === this.currentTaskId)
					if (taskIndex !== -1) {
						this.taskList[taskIndex].deadline = deadline
					}

					uni.showToast({
						title: '设置成功',
						icon: 'success'
					})
				} catch (error) {
					errorHandler.handleError(error, { showToast: true })
				}
			},



			// PC端日期设置处理
			async setDeadline(taskId, value) {
				this.currentTaskId = taskId
				await this.saveDeadline(value)
			},

			// 添加任务
			addTask(groupId = null) {
				uni.navigateTo({
					url: `/pages/opendb-task/add?project_id=${this.project_id}&group_id=${groupId || ''}`,
					events: {
						refreshData: () => {
							// 刷新任务列表
							this.loadTaskList()
						}
					}
				})
			},

			// 添加分组
			addGroup() {
				this.newGroup = { name: '', order: 0 }
				this.$refs['popup-add-group'].open()
			},

			// 确认添加分组
			async confirmAddGroup() {
				if (!this.newGroup.name.trim()) {
					uni.showToast({
						title: '请输入分组名称',
						icon: 'none'
					})
					return
				}

				try {
					const db = uniCloud.database()
					const result = await db.collection('task-group').add({
						name: this.newGroup.name,
						order: parseInt(this.newGroup.order) || 0,
						project_id: this.project_id
					})

					// 重新加载分组数据
					await this.loadGroups()
					
					this.$refs['popup-add-group'].close()
					uni.showToast({
						title: '分组创建成功',
						icon: 'success'
					})
				} catch (error) {
					errorHandler.handleError(error, { showToast: true })
				}
			},

			// 取消添加分组
			cancelAddGroup() {
				this.$refs['popup-add-group'].close()
			},

			// 打开编辑分组弹窗
			openEditGroupPopup(group) {
				this.editGroup = {
					_id: group._id,
					name: group.name,
					order: group.order || 0
				}
				this.$refs['popup-edit-group'].open()
			},

			// 确认编辑分组
			async confirmEditGroup() {
				if (!this.editGroup.name.trim()) {
					uni.showToast({
						title: '请输入分组名称',
						icon: 'none'
					})
					return
				}

				try {
					const db = uniCloud.database()
					await db.collection('task-group').doc(this.editGroup._id).update({
						name: this.editGroup.name,
						order: parseInt(this.editGroup.order) || 0
					})

					await this.loadGroups()
					this.$refs['popup-edit-group'].close()
					uni.showToast({
						title: '修改成功',
						icon: 'success'
					})
				} catch (error) {
					errorHandler.handleError(error, { showToast: true })
				}
			},

			// 取消编辑分组
			cancelEditGroup() {
				this.$refs['popup-edit-group'].close()
			},

			// 归档分组
			archiveGroup(group) {
				uni.showModal({
					title: '归档确认',
					content: `确定要归档分组「${group.name}」吗？归档后分组将从列表中隐藏。`,
					confirmText: '归档',
					confirmColor: '#f0ad4e',
					success: async (res) => {
						if (res.confirm) {
							try {
								const db = uniCloud.database()
								await db.collection('task-group').doc(group._id).update({
									archived: true,
									archived_date: Date.now()
								})
								await this.loadGroups()
								uni.showToast({
									title: '分组已归档',
									icon: 'success'
								})
							} catch (e) {
								errorHandler.handleError(e, { showToast: true })
							}
						}
					}
				})
			},

			// 删除分组
			deleteGroup(group) {
				const taskCount = this.taskList.filter(t => this.getTaskGroupId(t) === group._id).length
				const content = taskCount > 0
					? `分组「${group.name}」下有 ${taskCount} 个任务，删除分组后这些任务将变为未分组状态。确定删除吗？`
					: `确定要删除分组「${group.name}」吗？`

				uni.showModal({
					title: '删除确认',
					content: content,
					confirmText: '删除',
					confirmColor: '#e74c3c',
					success: async (res) => {
						if (res.confirm) {
							try {
								const db = uniCloud.database()
								// 将该分组下的任务移至未分组
								if (taskCount > 0) {
									await db.collection('opendb-task').where({
										group_id: group._id
									}).update({
										group_id: ''
									})
								}
								// 删除分组
								await db.collection('task-group').doc(group._id).remove()

								await this.loadGroups()
								// 刷新任务列表
								this.loadTaskList()

								uni.showToast({
									title: '分组已删除',
									icon: 'success'
								})
							} catch (e) {
								errorHandler.handleError(e, { showToast: true })
							}
						}
					}
				})
			},

			// 打开项目设置页面（直接跳转，不再显示菜单）
			openProjectMenu() {
				uni.navigateTo({
					url: `/pages/opendb-projects/edit?id=${this.project_id}`,
					events: {
						refreshData: () => {
							// 刷新项目信息
							this.loadProjectInfo()
						}
					}
				})
			},

			// 跳转到已完成任务列表
			goToCompletedTasks() {
				uni.navigateTo({
					url: `/pages/opendb-task/list-done?id=${this.project_id}&name=${encodeURIComponent(this.project_name)}`
				})
			},

			// 跳转到已归档分组列表
			goToArchivedGroups() {
				uni.navigateTo({
					url: `/pages/opendb-task/list-archived?id=${this.project_id}&name=${encodeURIComponent(this.project_name)}`
				})
			},

			// 加载项目信息
			async loadProjectInfo() {
				try {
					const db = uniCloud.database()
					const { result } = await db.collection('opendb-projects')
						.doc(this.project_id)
						.field('name')
						.get()

					if (result.data.length > 0) {
						this.project_name = result.data[0].name
						uni.setNavigationBarTitle({
							title: this.project_name
						})
					}
				} catch (e) {
					errorHandler.handleError(e, { showToast: true })
				}
			},

			// 生成随机颜色
			getRandomColor(text) {
				const colors = [
					'#f56a00', '#7265e6', '#ffbf00', '#00a2ae',
					'#87d068', '#108ee9', '#722ed1', '#eb2f96'
				]
				const index = text.charCodeAt(0) % colors.length
				return colors[index]
			},

			// 处理优先级变更（乐观更新）
			handlePriorityChange({ taskId, priority }) {
				const taskIndex = this.taskList.findIndex(t => t._id === taskId)
				if (taskIndex === -1) return

				// 保存旧值用于回滚
				const oldPriority = this.taskList[taskIndex].priority

				// 乐观更新 UI
				this.taskList[taskIndex].priority = priority

				const priorityText = { 0: '较低', 1: '普通', 2: '较高', 3: '最高' }[priority] || '未知'
				uni.showToast({
					title: `优先级: ${priorityText}`,
					icon: 'success'
				})

				// 后台同步到服务器
				const db = uniCloud.database()
				db.collection('opendb-task').doc(taskId).update({
					priority: priority
				}).catch(error => {
					console.error('更新优先级失败:', error)
					// 回滚
					this.taskList[taskIndex].priority = oldPriority
					uni.showToast({
						title: '更新失败，已恢复',
						icon: 'none'
					})
				})
			},

			// 快速编辑更新回调
			onQuickEditUpdate(data) {
				const { type, taskId, value } = data
				const taskIndex = this.taskList.findIndex(task => task._id === taskId)
				if (taskIndex !== -1) {
					if (type === 'priority') {
						this.taskList[taskIndex].priority = value
					} else if (type === 'deadline') {
						this.taskList[taskIndex].deadline = value
					}
				}
			},

			// 移动端添加菜单
			showMobileAddMenu() {
				uni.showActionSheet({
					itemList: ['添加任务', '添加分组'],
					success: (res) => {
						switch (res.tapIndex) {
							case 0:
								this.addTask()
								break
							case 1:
								this.addGroup()
								break
						}
					}
				})
			}
		}
	}
</script>

<style scoped>
.container {
	padding: 0 24px;
	padding-bottom: 24px;
	background-color: #f7f8fa;
	min-height: 100vh;
	max-width: 1200px;
	margin: 0 auto;
	box-sizing: border-box;
}

/* 移动端适配 */
@media (max-width: 767px) {
	.container {
		padding: 0 12px;
		padding-bottom: calc(12px + var(--safe-area-bottom, 0px));
	}
}

/* 大屏幕适配 */
@media (min-width: 1200px) {
	.container {
		padding: 0 40px;
		padding-bottom: 40px;
	}
}

/* ===== PC端页面标题栏 ===== */
.pc-page-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 0;
	margin-bottom: 8px;
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
}

.pc-back-btn:hover {
	background-color: #d1f7e8;
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

.pc-header-right {
	display: flex;
	align-items: center;
	gap: 8px;
}

/* ===== 导航栏操作按钮 ===== */
.nav-action-btn {
	width: 36px;
	height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: var(--radius-full);
	background-color: var(--color-bg-hover);
	cursor: pointer;
	transition: var(--transition-base);
}

.nav-action-btn:hover {
	background-color: var(--color-bg-active);
}

.nav-action-btn:active {
	transform: scale(0.95);
}

/* 底部快捷链接 */
.bottom-links {
	display: flex;
	gap: 12px;
	margin: 24px var(--spacing-base);
}

/* 移动端底部链接 */
@media (max-width: 767px) {
	.bottom-links {
		gap: 8px;
		margin: 16px 0;
	}

	.bottom-link {
		padding: 12px 14px;
		border-radius: 8px;
	}

	.bottom-link text {
		font-size: 13px;
	}
}

.bottom-link {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 14px 20px;
	background-color: #ffffff;
	border-radius: 10px;
	box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
	cursor: pointer;
	transition: all 0.25s ease;
}

.bottom-link:hover {
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	transform: translateY(-1px);
}

.bottom-link:first-child:hover {
	background-color: #f8f9fa;
}

.bottom-link:last-child:hover {
	background-color: #f0fdf7;
}

.bottom-link text {
	font-size: 14px;
	font-weight: 500;
}

.bottom-link:first-child text {
	color: #6c757d;
}

.bottom-link:last-child text {
	color: #42b983;
}

/* 任务操作栏 */
.task-actions {
	margin: var(--spacing-base);
	margin-top: 20px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 18px 24px;
	background: linear-gradient(135deg, #42b983 0%, #359568 100%);
	border-radius: 12px;
	box-shadow: 0 2px 8px rgba(66, 185, 131, 0.25);
	transition: all 0.25s ease;
}

/* 移动端操作栏 */
@media (max-width: 767px) {
	.task-actions {
		flex-wrap: wrap;
		padding: 14px 16px;
		gap: 12px;
		margin: 12px 0;
	}

	.task-actions__left {
		width: 100%;
		justify-content: space-between;
	}

	.task-label {
		font-size: 14px;
	}

	.task-label::before {
		width: 3px;
		height: 14px;
		margin-right: 8px;
	}

	.task-btns {
		gap: 8px;
	}

	.add-task-btn,
	.add-group-btn {
		padding: 6px 12px !important;
		font-size: 12px !important;
	}

	.filter-trigger {
		position: absolute;
		right: 28px;
		top: 14px;
	}
}

.task-actions:hover {
	box-shadow: 0 4px 12px rgba(66, 185, 131, 0.35);
	transform: translateY(-1px);
}

.task-actions__left {
	display: flex;
	align-items: center;
	gap: 20px;
}

.task-label {
	color: #ffffff;
	font-weight: 600;
	font-size: 16px;
	display: flex;
	align-items: center;
}

.task-label::before {
	content: '';
	display: inline-block;
	width: 4px;
	height: 18px;
	background: rgba(255, 255, 255, 0.6);
	margin-right: 10px;
	border-radius: 2px;
}

.task-btns {
	display: flex;
	align-items: center;
	gap: 10px;
}

.add-task-btn,
.add-group-btn {
	display: flex !important;
	align-items: center !important;
	gap: 5px !important;
	border-radius: 8px !important;
	font-weight: 600 !important;
	transition: all 0.25s ease !important;
	font-size: 13px !important;
	padding: 8px 16px !important;
	line-height: 1 !important;
}

.add-task-btn {
	background-color: #ffffff !important;
	border-color: #ffffff !important;
	color: #42b983 !important;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1) !important;
}

.add-task-btn:hover {
	background-color: #f0fdf7 !important;
	transform: translateY(-2px) !important;
	box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15) !important;
}

.add-group-btn {
	background-color: rgba(255, 255, 255, 0.15) !important;
	color: #ffffff !important;
	border: 1.5px solid rgba(255, 255, 255, 0.8) !important;
}

.add-group-btn:hover {
	background-color: rgba(255, 255, 255, 0.25) !important;
	border-color: #ffffff !important;
	transform: translateY(-2px) !important;
}

.filter-trigger {
	position: relative;
	width: 32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 8px;
	background-color: rgba(255, 255, 255, 0.15);
	cursor: pointer;
	transition: all 0.2s ease;
}

.filter-trigger:hover {
	background-color: rgba(255, 255, 255, 0.25);
}

.filter-trigger--active {
	background-color: rgba(255, 255, 255, 0.3);
}

.filter-badge {
	position: absolute;
	top: 4px;
	right: 4px;
	width: 8px;
	height: 8px;
	background-color: #ffcc00;
	border-radius: 50%;
	border: 2px solid #42b983;
}

/* 筛选弹出层 */
.filter-popup {
	width: 300px;
	border-radius: 12px;
	overflow: visible;
}

.filter-popup__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 20px;
	border-bottom: 1px solid #f0f0f0;
}

.filter-popup__title {
	font-size: 16px;
	font-weight: 600;
	color: #2c3e50;
}

.filter-popup__close {
	width: 28px;
	height: 28px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 6px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.filter-popup__close:hover {
	background-color: #f7f8fa;
}

.filter-popup__content {
	padding: 20px;
	overflow: visible;
}

.filter-popup__item {
	margin-bottom: 16px;
}

.filter-popup__item:last-child {
	margin-bottom: 0;
}

.filter-popup__label {
	display: block;
	font-size: 13px;
	font-weight: 500;
	color: #6c757d;
	margin-bottom: 8px;
}

.filter-popup__select {
	width: 100%;
}

.filter-popup__footer {
	display: flex;
	gap: 12px;
	padding: 16px 20px;
	border-top: 1px solid #f0f0f0;
	background-color: #fafafa;
}

.filter-popup__btn {
	flex: 1;
	padding: 10px 0 !important;
	border-radius: 8px !important;
	font-size: 14px !important;
	font-weight: 500 !important;
	transition: all 0.2s ease !important;
}

.filter-popup__btn--reset {
	background-color: #f7f8fa !important;
	color: #6c757d !important;
	border: 1px solid #e9ecef !important;
}

.filter-popup__btn--reset:hover {
	background-color: #e9ecef !important;
}

.filter-popup__btn--confirm {
	background-color: #42b983 !important;
	color: #ffffff !important;
	border: none !important;
}

.filter-popup__btn--confirm:hover {
	background-color: #359568 !important;
}

/* 弹出层下拉样式 - 已移至无 scoped 块 */


.error-message {
	color: #e74c3c;
	text-align: center;
	padding: 32px;
	background-color: #fdecea;
	border-radius: 8px;
	font-weight: 500;
}

.loading-state {
	padding: 40px;
	text-align: center;
}

/* 弹出层样式 */
.assignee-popup {
	padding: 24px;
	width: 280px;
	border-radius: 12px;
}

.popup-title {
	display: flex;
	justify-content: center;
	font-weight: 600;
	font-size: 17px;
	color: #2c3e50;
	margin-bottom: 24px;
	padding-bottom: 16px;
	border-bottom: 2px solid #e6fcf5;
}

.popup-content {
	display: flex;
	justify-content: center;
	margin-bottom: 24px;
}

.popup-buttons {
	display: flex;
	justify-content: center;
	gap: 12px;
}

.popup-buttons button {
	border-radius: 8px !important;
	font-weight: 500 !important;
	padding: 10px 24px !important;
	transition: all 0.25s ease !important;
}

.popup-buttons button[type="primary"] {
	background-color: #42b983 !important;
	border-color: #42b983 !important;
}

.popup-buttons button[type="primary"]:hover {
	background-color: #359568 !important;
	box-shadow: 0 4px 14px rgba(66, 185, 131, 0.2) !important;
}

.popup-buttons button[type="default"]:hover {
	background-color: #f7f8fa !important;
}

/* 分组弹出层 */
.group-popup {
	padding: 24px;
	min-width: 320px;
	border-radius: 12px;
}

.group-popup__title {
	font-size: 17px;
	font-weight: 600;
	margin-bottom: 24px;
	text-align: center;
	color: #2c3e50;
	padding-bottom: 16px;
	border-bottom: 2px solid #e6fcf5;
}

.group-popup__content {
	margin-bottom: 24px;
}

.group-popup__buttons {
	display: flex;
	justify-content: center;
	gap: 12px;
}

.group-popup__buttons button {
	border-radius: 8px !important;
	font-weight: 500 !important;
	padding: 10px 24px !important;
	transition: all 0.25s ease !important;
}

.group-popup__buttons button[type="primary"] {
	background-color: #42b983 !important;
	border-color: #42b983 !important;
}

.group-popup__buttons button[type="primary"]:hover {
	background-color: #359568 !important;
	box-shadow: 0 4px 14px rgba(66, 185, 131, 0.2) !important;
}

/* uni-forms / uni-data-select / uni-popup 样式优化 - 已移至无 scoped 块 */

/* ===== 移动端精简头部 ===== */
.mobile-task-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 4px;
	margin-top: 8px;
}

.mobile-task-label {
	display: flex;
	align-items: center;
	gap: 4px;
}

.mobile-task-label text:first-child {
	font-size: 18px;
	font-weight: 600;
	color: #2c3e50;
}

.task-total-count {
	font-size: 14px;
	color: #6c757d;
	font-weight: 500;
}

.mobile-header-actions {
	display: flex;
	align-items: center;
	gap: 8px;
}

.mobile-filter-btn {
	width: 36px;
	height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 10px;
	background-color: #f7f8fa;
	transition: all 0.2s ease;
}

.mobile-filter-btn:active {
	transform: scale(0.95);
}

.mobile-filter-btn--active {
	background-color: #e6fcf5;
}

.mobile-menu-btn {
	width: 36px;
	height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 10px;
	background-color: #f7f8fa;
	transition: all 0.2s ease;
	margin-left: 8px;
}

.mobile-menu-btn:active {
	transform: scale(0.95);
	background-color: #e6fcf5;
}

</style>

<!--
	独立的无 scoped 样式块，用于覆盖 uni-fab 组件样式
	原因：:deep() 选择器在小程序和 App 平台不支持
-->
<style lang="scss">
/* ===== 移动端悬浮添加按钮 FAB - 覆盖 uni-fab 默认样式 ===== */
.mobile-fab .uni-fab__circle {
	right: 20px !important;
	left: auto !important;
	bottom: calc(80px + var(--safe-area-bottom, 0px)) !important;
	width: 56px !important;
	height: 56px !important;
	border-radius: 28px !important;
	background: linear-gradient(135deg, #42b983 0%, #359568 100%) !important;
	box-shadow: 0 4px 16px rgba(66, 185, 131, 0.4) !important;
	z-index: 100 !important;
	transition: all 0.25s ease !important;
}

.mobile-fab .uni-fab__circle:active {
	transform: scale(0.92) !important;
	box-shadow: 0 2px 8px rgba(66, 185, 131, 0.3) !important;
}

/* ===== list.vue - 弹出层下拉样式 ===== */
.filter-popup .uni-stat__select {
	border-radius: 8px !important;
}

.filter-popup .uni-select__selector {
	max-height: 200px;
	overflow-y: auto;
}

.container .uni-popup__wrapper {
	overflow: visible !important;
	border-radius: 12px !important;
}

/* ===== list.vue - uni-forms 样式优化 ===== */
.container .uni-forms-item__label {
	color: #2c3e50;
	font-weight: 500;
}

.container .uni-easyinput__content-input {
	border-color: #e9ecef !important;
	border-radius: 6px !important;
}

.container .uni-easyinput__content-input:focus {
	border-color: #42b983 !important;
	box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1) !important;
}

/* ===== list.vue - uni-data-select 样式优化 ===== */
.container .uni-stat__select {
	border-color: #e9ecef !important;
	border-radius: 8px !important;
}

.container .uni-stat__select:hover {
	border-color: #42b983 !important;
}

.container .uni-stat__select-text {
	color: #42b983 !important;
	font-weight: 500 !important;
}
</style>