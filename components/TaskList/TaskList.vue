<template>
  <view class="task-list-container">
    <!-- 点击遮罩关闭下拉框 -->
    <view v-if="openAssigneeTaskId || openPriorityTaskId" class="dropdown-backdrop" @click="closeAllDropdowns"></view>
    <!-- 未分组任务 -->
    <view class="task-group">
      <uni-list class="task-list" v-if="ungroupedTasks.length > 0">
        <view
          v-for="item in ungroupedTasks"
          :key="item._id"
          class="task-item-wrapper"
          :class="[
            { 'task-completing': completingTaskId === item._id },
            { 'task-item-mobile': !isPC }
          ]"
          @click="handleTaskClick(item._id)"
        >
          <!-- 移动端：优先级颜色条 -->
          <view v-if="!isPC" class="priority-bar" :class="`priority-bar--${item.priority || 0}`"></view>

          <!-- PC端悬浮操作按钮 -->
          <view class="task-hover-actions" v-if="isPC">
            <view class="hover-action-btn hover-action-btn--danger" @click.stop="deleteTask(item._id)">
              <uni-icons type="trash" size="14" color="#e74c3c"></uni-icons>
            </view>
            <view class="hover-action-btn" @click.stop="editTask(item._id)">
              <uni-icons type="compose" size="14" color="#6c757d"></uni-icons>
            </view>
          </view>

          <!-- 移动端：简化布局 -->
          <view v-if="!isPC" class="mobile-task-item">
            <checkbox @click.stop="finishTask(item._id)" color="#42b983" class="mobile-checkbox" />
            <view class="mobile-task-content">
              <view class="mobile-task-title-row">
                <text class="task-title">{{ item.title }}</text>
                <view v-if="item.subtaskCount && item.subtaskCount.total > 0" class="subtask-badge">
                  <uni-icons type="list" size="12" color="#6c757d"></uni-icons>
                  <text :class="{ 'subtask-all-done': item.subtaskCount.completed === item.subtaskCount.total }">
                    {{ item.subtaskCount.completed }}/{{ item.subtaskCount.total }}
                  </text>
                </view>
              </view>
              <view class="mobile-task-meta">
                <view v-if="item.deadline" class="mobile-deadline" :class="{ 'overdue': isOverdue(item.deadline) }">
                  {{ formatDeadline(item.deadline) }}
                </view>
                <text v-else class="mobile-no-deadline">无截止日期</text>
              </view>
            </view>
          </view>

          <!-- PC端：原有布局 -->
          <uni-list-item v-else :clickable="true">
            <template v-slot:header>
              <checkbox @click.stop="finishTask(item._id)" color="#42b983" />
            </template>
            <template v-slot:body>
              <view class="task-content">
                <view class="task-title-row">
                  <text class="task-title">{{ item.title }}</text>
                  <view v-if="item.subtaskCount && item.subtaskCount.total > 0" class="subtask-badge">
                    <uni-icons type="list" size="12" color="#6c757d"></uni-icons>
                    <text :class="{ 'subtask-all-done': item.subtaskCount.completed === item.subtaskCount.total }">
                      {{ item.subtaskCount.completed }}/{{ item.subtaskCount.total }}
                    </text>
                  </view>
                </view>
              </view>
            </template>
            <template v-slot:footer>
              <view class="task-actions">
                <view class="deadline" :class="{ 'overdue': isOverdue(item.deadline) }" @click.stop="handleDeadlineClick(item._id, item.deadline, $event)">
                  {{ formatDeadline(item.deadline) }}
                </view>
                <view class="priority-wrapper">
                  <text class="priority-tag" :class="`priority-${item.priority || 0}`" @click.stop="togglePriorityDropdown(item._id, item.priority)">
                    {{ getPriorityText(item.priority) }}
                  </text>
                  <!-- 优先级下拉选择 -->
                  <view v-if="openPriorityTaskId === item._id" class="priority-dropdown" @click.stop>
                    <view
                      v-for="opt in priorityOptions"
                      :key="opt.value"
                      class="priority-option"
                      :class="{ 'priority-option--selected': currentPriority === opt.value }"
                      @click.stop="selectPriority(item._id, opt.value)"
                    >
                      <view class="priority-option-dot" :style="{ backgroundColor: opt.color }"></view>
                      <text class="priority-option-label">{{ opt.label }}</text>
                      <uni-icons v-if="currentPriority === opt.value" type="checkmarkempty" size="16" color="#42b983"></uni-icons>
                    </view>
                  </view>
                </view>
                <view class="assignee-wrapper">
                  <view class="assignee" @click.stop="toggleAssigneeDropdown(item._id, item.assignee)">
                    <image v-if="getAssigneeAvatar(item.assignee)" :src="getAssigneeAvatar(item.assignee)" class="assignee-avatar-small" mode="aspectFill"></image>
                    <view v-else-if="getAssigneeName(item.assignee) !== '未分配'" class="assignee-avatar-small assignee-avatar-text" :style="{ backgroundColor: getAvatarColor(getAssigneeName(item.assignee)) }">
                      {{ getAssigneeName(item.assignee).slice(0,1) }}
                    </view>
                    <uni-icons v-else type="person" size="14" color="#42b983"></uni-icons>
                  </view>
                  <!-- 负责人下拉选择 -->
                  <view v-if="openAssigneeTaskId === item._id" class="assignee-dropdown" @click.stop>
                    <view class="assignee-dropdown-search">
                      <uni-icons type="search" size="16" color="#999"></uni-icons>
                      <input
                        type="text"
                        v-model="assigneeSearchKeyword"
                        placeholder="输入关键字查询"
                        class="assignee-search-input"
                        @input="onAssigneeSearch"
                      />
                      <uni-icons type="person" size="16" color="#999"></uni-icons>
                    </view>
                    <scroll-view scroll-y class="assignee-dropdown-list">
                      <!-- 无负责人选项 -->
                      <view
                        class="assignee-option"
                        :class="{ 'assignee-option--selected': !currentAssigneeId }"
                        @click.stop="selectAssignee(item._id, null)"
                      >
                        <view class="assignee-option-avatar">
                          <uni-icons type="person" size="24" color="#42b983"></uni-icons>
                        </view>
                        <text class="assignee-option-name">无负责人</text>
                        <uni-icons v-if="!currentAssigneeId" type="checkmarkempty" size="18" color="#42b983"></uni-icons>
                      </view>
                      <!-- 成员列表 -->
                      <view
                        v-for="member in filteredMembers"
                        :key="member.value"
                        class="assignee-option"
                        :class="{ 'assignee-option--selected': currentAssigneeId === member.value }"
                        @click.stop="selectAssignee(item._id, member.value)"
                      >
                        <image v-if="member.avatar" :src="member.avatar" class="assignee-option-avatar" mode="aspectFill"></image>
                        <view v-else class="assignee-option-avatar assignee-avatar-text" :style="{ backgroundColor: getAvatarColor(member.text) }">
                          {{ member.text.slice(0,1) }}
                        </view>
                        <text class="assignee-option-name">{{ member.text }}</text>
                        <uni-icons v-if="currentAssigneeId === member.value" type="checkmarkempty" size="18" color="#42b983"></uni-icons>
                      </view>
                    </scroll-view>
                  </view>
                </view>
              </view>
            </template>
          </uni-list-item>
        </view>
      </uni-list>

      <!-- 未分组的添加新任务入口 -->
      <view class="quick-add-section">
        <view class="quick-add-trigger" @click="addTask('')">
          <uni-icons type="plusempty" size="14" color="#42b983"></uni-icons>
          <text>添加新任务</text>
        </view>
      </view>
    </view>

    <!-- 分组任务 -->
    <view v-for="group in groupedTasks" :key="group._id" class="task-group">
      <view class="group-header" @click="toggleGroupCollapse(group._id)">
        <view class="group-header-left">
          <uni-icons
            :type="collapsedGroups[group._id] ? 'right' : 'bottom'"
            size="14"
            color="#6c757d"
            class="collapse-icon"
          ></uni-icons>
          <text class="group-title">{{ group.name }}</text>
          <text class="task-count">({{ group.tasks?.length || 0 }})</text>
        </view>
        <view class="group-actions" @click.stop>
          <view class="group-action-btn" @click.stop="editGroup(group)" title="编辑分组">
            <uni-icons type="compose" size="16" color="#6c757d"></uni-icons>
            <text class="action-tooltip">编辑</text>
          </view>
          <view class="group-action-btn group-action-btn--archive" @click.stop="archiveGroup(group)" title="归档分组">
            <uni-icons type="download" size="16" color="#b8860b"></uni-icons>
            <text class="action-tooltip">归档</text>
          </view>
          <view class="group-action-btn group-action-btn--danger" @click.stop="deleteGroup(group)" title="删除分组">
            <uni-icons type="trash" size="16" color="#e74c3c"></uni-icons>
            <text class="action-tooltip">删除</text>
          </view>
        </view>
      </view>
      <view class="group-content" v-show="!collapsedGroups[group._id]">
      <uni-list class="task-list" v-if="group.tasks?.length > 0">
        <view
          v-for="item in group.tasks"
          :key="item._id"
          class="task-item-wrapper"
          :class="[
            { 'task-completing': completingTaskId === item._id },
            { 'task-item-mobile': !isPC }
          ]"
          @click="handleTaskClick(item._id)"
        >
          <!-- 移动端：优先级颜色条 -->
          <view v-if="!isPC" class="priority-bar" :class="`priority-bar--${item.priority || 0}`"></view>

          <!-- PC端悬浮操作按钮 -->
          <view class="task-hover-actions" v-if="isPC">
            <view class="hover-action-btn hover-action-btn--danger" @click.stop="deleteTask(item._id)">
              <uni-icons type="trash" size="14" color="#e74c3c"></uni-icons>
            </view>
            <view class="hover-action-btn" @click.stop="editTask(item._id)">
              <uni-icons type="compose" size="14" color="#6c757d"></uni-icons>
            </view>
          </view>

          <!-- 移动端：简化布局 -->
          <view v-if="!isPC" class="mobile-task-item">
            <checkbox @click.stop="finishTask(item._id)" color="#42b983" class="mobile-checkbox" />
            <view class="mobile-task-content">
              <view class="mobile-task-title-row">
                <text class="task-title">{{ item.title }}</text>
                <view v-if="item.subtaskCount && item.subtaskCount.total > 0" class="subtask-badge">
                  <uni-icons type="list" size="12" color="#6c757d"></uni-icons>
                  <text :class="{ 'subtask-all-done': item.subtaskCount.completed === item.subtaskCount.total }">
                    {{ item.subtaskCount.completed }}/{{ item.subtaskCount.total }}
                  </text>
                </view>
              </view>
              <view class="mobile-task-meta">
                <view v-if="item.deadline" class="mobile-deadline" :class="{ 'overdue': isOverdue(item.deadline) }">
                  {{ formatDeadline(item.deadline) }}
                </view>
                <text v-else class="mobile-no-deadline">无截止日期</text>
              </view>
            </view>
          </view>

          <!-- PC端：原有布局 -->
          <uni-list-item v-else :clickable="true">
            <template v-slot:header>
              <checkbox @click.stop="finishTask(item._id)" color="#42b983" />
            </template>
            <template v-slot:body>
              <view class="task-content">
                <view class="task-title-row">
                  <text class="task-title">{{ item.title }}</text>
                  <view v-if="item.subtaskCount && item.subtaskCount.total > 0" class="subtask-badge">
                    <uni-icons type="list" size="12" color="#6c757d"></uni-icons>
                    <text :class="{ 'subtask-all-done': item.subtaskCount.completed === item.subtaskCount.total }">
                      {{ item.subtaskCount.completed }}/{{ item.subtaskCount.total }}
                    </text>
                  </view>
                </view>
              </view>
            </template>
            <template v-slot:footer>
              <view class="task-actions">
                <view class="deadline" :class="{ 'overdue': isOverdue(item.deadline) }" @click.stop="handleDeadlineClick(item._id, item.deadline, $event)">
                  {{ formatDeadline(item.deadline) }}
                </view>
                <view class="priority-wrapper">
                  <text class="priority-tag" :class="`priority-${item.priority || 0}`" @click.stop="togglePriorityDropdown(item._id, item.priority)">
                    {{ getPriorityText(item.priority) }}
                  </text>
                  <!-- 优先级下拉选择 -->
                  <view v-if="openPriorityTaskId === item._id" class="priority-dropdown" @click.stop>
                    <view
                      v-for="opt in priorityOptions"
                      :key="opt.value"
                      class="priority-option"
                      :class="{ 'priority-option--selected': currentPriority === opt.value }"
                      @click.stop="selectPriority(item._id, opt.value)"
                    >
                      <view class="priority-option-dot" :style="{ backgroundColor: opt.color }"></view>
                      <text class="priority-option-label">{{ opt.label }}</text>
                      <uni-icons v-if="currentPriority === opt.value" type="checkmarkempty" size="16" color="#42b983"></uni-icons>
                    </view>
                  </view>
                </view>
                <view class="assignee-wrapper">
                  <view class="assignee" @click.stop="toggleAssigneeDropdown(item._id, item.assignee)">
                    <image v-if="getAssigneeAvatar(item.assignee)" :src="getAssigneeAvatar(item.assignee)" class="assignee-avatar-small" mode="aspectFill"></image>
                    <view v-else-if="getAssigneeName(item.assignee) !== '未分配'" class="assignee-avatar-small assignee-avatar-text" :style="{ backgroundColor: getAvatarColor(getAssigneeName(item.assignee)) }">
                      {{ getAssigneeName(item.assignee).slice(0,1) }}
                    </view>
                    <uni-icons v-else type="person" size="14" color="#42b983"></uni-icons>
                  </view>
                  <!-- 负责人下拉选择 -->
                  <view v-if="openAssigneeTaskId === item._id" class="assignee-dropdown" @click.stop>
                    <view class="assignee-dropdown-search">
                      <uni-icons type="search" size="16" color="#999"></uni-icons>
                      <input
                        type="text"
                        v-model="assigneeSearchKeyword"
                        placeholder="输入关键字查询"
                        class="assignee-search-input"
                        @input="onAssigneeSearch"
                      />
                      <uni-icons type="person" size="16" color="#999"></uni-icons>
                    </view>
                    <scroll-view scroll-y class="assignee-dropdown-list">
                      <!-- 无负责人选项 -->
                      <view
                        class="assignee-option"
                        :class="{ 'assignee-option--selected': !currentAssigneeId }"
                        @click.stop="selectAssignee(item._id, null)"
                      >
                        <view class="assignee-option-avatar">
                          <uni-icons type="person" size="24" color="#42b983"></uni-icons>
                        </view>
                        <text class="assignee-option-name">无负责人</text>
                        <uni-icons v-if="!currentAssigneeId" type="checkmarkempty" size="18" color="#42b983"></uni-icons>
                      </view>
                      <!-- 成员列表 -->
                      <view
                        v-for="member in filteredMembers"
                        :key="member.value"
                        class="assignee-option"
                        :class="{ 'assignee-option--selected': currentAssigneeId === member.value }"
                        @click.stop="selectAssignee(item._id, member.value)"
                      >
                        <image v-if="member.avatar" :src="member.avatar" class="assignee-option-avatar" mode="aspectFill"></image>
                        <view v-else class="assignee-option-avatar assignee-avatar-text" :style="{ backgroundColor: getAvatarColor(member.text) }">
                          {{ member.text.slice(0,1) }}
                        </view>
                        <text class="assignee-option-name">{{ member.text }}</text>
                        <uni-icons v-if="currentAssigneeId === member.value" type="checkmarkempty" size="18" color="#42b983"></uni-icons>
                      </view>
                    </scroll-view>
                  </view>
                </view>
              </view>
            </template>
          </uni-list-item>
        </view>
      </uni-list>
      <!-- 空分组提示 -->
      <view v-else class="empty-group-hint">
        <text>暂无任务</text>
      </view>

      <!-- 分组的添加新任务入口 -->
      <view class="quick-add-section">
        <view class="quick-add-trigger" @click="addTask(group._id)">
          <uni-icons type="plusempty" size="14" color="#42b983"></uni-icons>
          <text>添加新任务</text>
        </view>
      </view>
      </view>
    </view>
  </view>
</template>

<script>
import { formatDeadline, isOverdue, getPriorityText, getAvatarColor } from '@/utils/task.js'

export default {
  name: 'TaskList',
  props: {
    tasks: {
      type: Array,
      default: () => []
    },
    groups: {
      type: Array,
      default: () => []
    },
    members: {
      type: Array,
      default: () => []
    },
    hasFilter: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      openAssigneeTaskId: null,
      currentAssigneeId: null,  // 当前选中任务的负责人ID
      assigneeSearchKeyword: '',
      collapsedGroups: {},
      completingTaskId: null,  // 正在完成的任务ID，用于动画
      // 优先级下拉
      openPriorityTaskId: null,
      currentPriority: 0,
      priorityOptions: [
        { value: 0, label: '较低', color: '#6c757d' },
        { value: 1, label: '普通', color: '#42b983' },
        { value: 2, label: '较高', color: '#f39c12' },
        { value: 3, label: '最高', color: '#e74c3c' }
      ]
    }
  },
  computed: {
    filteredMembers() {
      if (!this.assigneeSearchKeyword) {
        return this.members
      }
      const keyword = this.assigneeSearchKeyword.toLowerCase()
      return this.members.filter(member =>
        member.text.toLowerCase().includes(keyword) ||
        (member.realName && member.realName.toLowerCase().includes(keyword))
      )
    },
    ungroupedTasks() {
      return this.tasks.filter(task => !this.getTaskGroupId(task))
    },
    groupedTasks() {
      const mapped = this.groups.map(group => ({
        ...group,
        tasks: this.tasks.filter(task => this.getTaskGroupId(task) === group._id)
      }))
      .sort((a, b) => (a.order || 0) - (b.order || 0))

      // 只有在有筛选条件时才过滤空分组
      if (this.hasFilter) {
        return mapped.filter(group => group.tasks.length > 0)
      }
      return mapped
    },
    isPC() {
      // 判断是否为PC端
      const systemInfo = uni.getSystemInfoSync()

      // H5环境下，通过屏幕宽度判断
      // #ifdef H5
      return systemInfo.windowWidth >= 768
      // #endif

      // 非H5环境，通过平台判断
      // #ifndef H5
      return systemInfo.platform === 'windows' || systemInfo.platform === 'mac' || systemInfo.platform === 'linux'
      // #endif
    }
  },
  methods: {
    // 切换分组折叠状态
    toggleGroupCollapse(groupId) {
      this.collapsedGroups = {
        ...this.collapsedGroups,
        [groupId]: !this.collapsedGroups[groupId]
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

    handleTaskClick(taskId) {
      this.$emit('task-click', taskId)
    },
    finishTask(taskId) {
      // 设置正在完成的任务ID，触发动画
      this.completingTaskId = taskId
      // 延迟发送事件，让动画先播放
      setTimeout(() => {
        this.$emit('finish-task', taskId)
        // 动画完成后清除状态
        setTimeout(() => {
          this.completingTaskId = null
        }, 100)
      }, 400)
    },
    toggleAssigneeDropdown(taskId, currentAssignee) {
      // 关闭其他下拉框
      this.closePriorityDropdown()

      if (this.openAssigneeTaskId === taskId) {
        this.closeAssigneeDropdown()
      } else {
        this.openAssigneeTaskId = taskId
        this.currentAssigneeId = this.getCurrentAssigneeId(currentAssignee)
        this.assigneeSearchKeyword = ''
      }
    },
    closeAssigneeDropdown() {
      this.openAssigneeTaskId = null
      this.currentAssigneeId = null
      this.assigneeSearchKeyword = ''
    },
    onAssigneeSearch() {
      // 搜索时自动过滤，由 computed 属性处理
    },
    selectAssignee(taskId, memberId) {
      this.$emit('set-assignee', { taskId, memberId })
      this.closeAssigneeDropdown()
    },
    // 获取负责人ID（JQL联表后为数组格式 [{_id, nickname}]）
    getCurrentAssigneeId(assignee) {
      if (!assignee) return null
      if (Array.isArray(assignee) && assignee.length > 0) {
        return assignee[0]._id
      }
      return null
    },
    // 获取负责人头像
    getAssigneeAvatar(assignee) {
      if (!assignee) return null
      // 优先从联表数据获取
      if (Array.isArray(assignee) && assignee.length > 0 && assignee[0].avatar_file?.url) {
        return assignee[0].avatar_file.url
      }
      // 从 members 列表获取
      const assigneeId = this.getCurrentAssigneeId(assignee)
      if (!assigneeId) return null
      const member = this.members.find(m => m.value === assigneeId)
      return member?.avatar || null
    },
    getAvatarColor,
    handleDeadlineClick(taskId, currentDeadline, event) {

      // PC端：使用原生日期选择器
      if (this.isPC) {
        // #ifdef H5
        // 创建一个临时的 input 元素
        const input = document.createElement('input')
        input.type = 'date'
        input.style.position = 'fixed'
        input.style.width = '1px'
        input.style.height = '1px'
        input.style.border = 'none'
        input.style.padding = '0'
        input.style.margin = '0'
        input.style.zIndex = '9999'

        // 尝试获取点击位置
        let left = '50%'
        let top = '50%'

        try {
          // 尝试从原生事件获取位置
          if (event && event.mp && event.mp.currentTarget) {
            const rect = event.mp.currentTarget.getBoundingClientRect()
            left = rect.left + 'px'
            top = rect.bottom + 'px'
          } else if (event && event.currentTarget && typeof event.currentTarget.getBoundingClientRect === 'function') {
            const rect = event.currentTarget.getBoundingClientRect()
            left = rect.left + 'px'
            top = rect.bottom + 'px'
          } else if (event && event.detail) {
            // 尝试从 detail 获取位置
            left = (event.detail.x || event.detail.clientX || window.innerWidth / 2) + 'px'
            top = (event.detail.y || event.detail.clientY || window.innerHeight / 2) + 'px'
          }
        } catch (e) {
          console.warn('无法获取点击位置，使用默认位置', e)
        }

        input.style.left = left
        input.style.top = top

        input.value = currentDeadline ? new Date(currentDeadline).toISOString().split('T')[0] : ''

        input.onchange = (e) => {
          this.$emit('save-deadline', taskId, e.target.value)
          if (input.parentNode) {
            document.body.removeChild(input)
          }
        }

        input.onblur = () => {
          setTimeout(() => {
            if (input.parentNode) {
              document.body.removeChild(input)
            }
          }, 200)
        }

        // 取消选择时也要清理
        input.oncancel = () => {
          if (input.parentNode) {
            document.body.removeChild(input)
          }
        }

        document.body.appendChild(input)

        // 使用 setTimeout 确保 input 已添加到 DOM
        setTimeout(() => {
          try {
            input.showPicker()
          } catch (e) {
            console.error('showPicker error:', e)
            // 如果 showPicker 失败，尝试聚焦触发
            input.focus()
            input.click()
          }
        }, 0)
        // #endif

        // #ifndef H5
        this.$emit('save-deadline', taskId, currentDeadline)
        // #endif
      } else {
        // 移动端：打开日期选择器
        this.$emit('open-deadline-picker', taskId, currentDeadline)
      }
    },
    formatDeadline(deadline) {
      return formatDeadline(deadline) || '设置截止日期'
    },
    isOverdue,
    // 获取负责人名称（JQL联表后为数组格式 [{_id, nickname}]）
    getAssigneeName(assignee) {
      if (!assignee) return '未分配'
      // 优先从联表数据获取
      if (Array.isArray(assignee) && assignee.length > 0 && assignee[0].nickname) {
        return assignee[0].nickname
      }
      // 从 members 列表获取
      const assigneeId = this.getCurrentAssigneeId(assignee)
      if (!assigneeId) return '未分配'
      const member = this.members.find(m => m.value === assigneeId)
      return member?.text || '未知'
    },
    getPriorityText,
    editGroup(group) {
      this.$emit('edit-group', group)
    },
    archiveGroup(group) {
      this.$emit('archive-group', group)
    },
    deleteGroup(group) {
      this.$emit('delete-group', group)
    },
    deleteTask(taskId) {
      this.$emit('delete-task', taskId)
    },
    editTask(taskId) {
      this.$emit('edit-task', taskId)
    },
    // ========== 优先级下拉 ==========
    togglePriorityDropdown(taskId, currentPriority) {
      // 关闭其他下拉框
      this.closeAssigneeDropdown()

      if (this.openPriorityTaskId === taskId) {
        this.closePriorityDropdown()
      } else {
        this.openPriorityTaskId = taskId
        this.currentPriority = currentPriority || 0
      }
    },
    closePriorityDropdown() {
      this.openPriorityTaskId = null
      this.currentPriority = 0
    },
    selectPriority(taskId, priority) {
      // 先关闭下拉框，立即响应
      this.closePriorityDropdown()
      // 发送事件给父组件处理
      this.$emit('change-priority', { taskId, priority })
    },
    closeAllDropdowns() {
      this.closeAssigneeDropdown()
      this.closePriorityDropdown()
    },

    // 添加任务（跳转到新增页面）
    addTask(groupId) {
      this.$emit('add-task', groupId)
    }
  }
}
</script>

<style scoped>
.task-list-container {
  padding: 0 12px 12px 12px;
  position: relative;
}

/* 下拉框遮罩 */
.dropdown-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  background-color: transparent;
}

.task-group {
  margin-bottom: 24px;
  background-color: #ffffff;
  border-radius: 8px;
  overflow: visible;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.25s ease;
}

.task-group:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

/* 任务项包装器 - 用于悬浮操作 */
.task-item-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

/* 样式已移至无 scoped 块 */

/* PC端悬浮操作按钮 */
.task-hover-actions {
  position: absolute;
  left: -70px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background-color: #42b983;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(66, 185, 131, 0.3);
  opacity: 0;
  transition: all 0.2s ease;
  z-index: 10;
}

.task-item-wrapper:hover .task-hover-actions {
  opacity: 1;
}

.hover-action-btn {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  transition: all 0.2s ease;
}

.hover-action-btn:hover {
  background-color: #ffffff;
  transform: scale(1.1);
}

.hover-action-btn--danger:hover {
  background-color: #fef2f2;
}

/* 空分组提示 */
.empty-group-hint {
  padding: 16px;
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: #f8faf8;
  border-bottom: 1px solid #e9ecef;
  border-left: 3px solid #42b983;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.group-header:hover {
  background-color: #f0fdf7;
}

.group-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.collapse-icon {
  transition: transform 0.2s ease;
}

.group-content {
  transition: all 0.2s ease;
}

.group-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.group-header:hover .group-actions {
  opacity: 1;
}

.group-action-btn {
  position: relative;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.group-action-btn:hover {
  background-color: #e9ecef;
}

/* 操作按钮 tooltip */
.action-tooltip {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 6px;
  padding: 4px 8px;
  background-color: #42b983;
  color: #fff;
  font-size: 12px;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  pointer-events: none;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(66, 185, 131, 0.3);
}

.action-tooltip::before {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-bottom-color: #42b983;
}

.group-action-btn:hover .action-tooltip {
  opacity: 1;
  visibility: visible;
}

.group-action-btn--archive:hover {
  background-color: #fef6e6;
}

.group-action-btn--danger:hover {
  background-color: #fef2f2;
}

.group-title {
  font-weight: 600;
  color: #2c3e50;
  font-size: 14px;
}

.task-count {
  color: #6c757d;
  font-size: 12px;
  margin-left: 8px;
  font-weight: 500;
}

.task-content {
  flex: 1;
  min-width: 0;
}

.task-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  flex: 1;
  min-width: 0;
}

.task-title {
  font-size: 14px;
  color: #2c3e50;
  line-height: 1.5;
  font-weight: 500;
  word-break: break-word;
  flex-shrink: 1;
  min-width: 0;
}

/* 优先级标签 */
.priority-tag {
  padding: 2px 0;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  width: 36px;
  text-align: center;
}

.priority-0 {
  background-color: #e6fcf5;
  color: #42b983;
}

.priority-1 {
  background-color: #f3f4f6;
  color: #6b7280;
}

.priority-2 {
  background-color: #fef3c7;
  color: #d97706;
}

.priority-3 {
  background-color: #fee2e2;
  color: #dc2626;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag {
  background-color: #e6fcf5;
  color: #359568;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.task-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.deadline {
  font-size: 12px;
  color: #6c757d;
  padding: 4px 8px;
  border-radius: 6px;
  background-color: #f7f8fa;
  cursor: pointer;
  transition: all 0.25s ease;
  white-space: nowrap;
  font-weight: 500;
  min-width: 80px;
  text-align: center;
}

.deadline:hover {
  background-color: #e6fcf5;
  color: #42b983;
}

.deadline.overdue {
  color: #e74c3c;
  background-color: #fdecea;
}

.deadline.overdue:hover {
  background-color: #fbe2e0;
}

/* 优先级选择器 */
.priority-wrapper {
  position: relative;
}

.priority-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  width: 140px;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
  padding: 8px 0;
}

.priority-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.priority-option:hover {
  background-color: #f5f5f5;
}

.priority-option--selected {
  background-color: #e6fcf5;
}

.priority-option--selected:hover {
  background-color: #d1f7e8;
}

.priority-option-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.priority-option-label {
  flex: 1;
  font-size: 14px;
  color: #333;
}

/* 负责人选择器 */
.assignee-wrapper {
  position: relative;
}

.assignee {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  background-color: #e6fcf5;
  transition: all 0.25s ease;
  width: 28px;
  height: 28px;
}

.assignee:hover {
  background-color: #d1f7e8;
}

.assignee-avatar-small {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  overflow: hidden;
}

.assignee-avatar-small.assignee-avatar-text {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

/* 负责人下拉选择框 */
.assignee-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  width: 240px;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
}

.assignee-dropdown-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.assignee-search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: #333;
  background: transparent;
}

.assignee-search-input::placeholder {
  color: #999;
}

.assignee-dropdown-list {
  max-height: 240px;
  padding: 8px 0;
}

.assignee-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.assignee-option:hover {
  background-color: #d1f7e8;
}

.assignee-option--selected {
  background-color: #e6fcf5;
}

.assignee-option--selected:hover {
  background-color: #c3f5de;
}

.assignee-option-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.assignee-option-avatar.assignee-avatar-text {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}

.assignee-option-name {
  flex: 1;
  font-size: 14px;
  color: #333;
}

/* 列表项优化 - 样式已移至无 scoped 块 */

/* 添加新任务入口 */
.quick-add-section {
  padding: 12px 16px;
}

.quick-add-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
  color: #42b983;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-add-trigger:hover {
  color: #359568;
}

.quick-add-trigger text {
  font-weight: 500;
}

/* 子任务徽章 */
.subtask-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background-color: #f3f4f6;
  border-radius: 10px;
  font-size: 11px;
  color: #6c757d;
  flex-shrink: 0;
}

.subtask-badge text {
  font-weight: 500;
}

.subtask-badge .subtask-all-done {
  color: #42b983;
}

/* 任务完成动画 */
.task-completing {
  animation: taskComplete 0.4s ease forwards;
}

@keyframes taskComplete {
  0% {
    opacity: 1;
    transform: translateX(0);
    background-color: transparent;
  }
  30% {
    background-color: #d1f7e8;
  }
  100% {
    opacity: 0;
    transform: translateX(50px);
    background-color: #d1f7e8;
  }
}

/* 完成动画时 checkbox 变绿 - 样式已移至无 scoped 块 */

/* ===== 移动端任务项样式 ===== */
.task-item-mobile {
  position: relative;
  background-color: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.task-item-mobile:last-child {
  border-bottom: none;
}

/* 优先级颜色条 */
.priority-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  border-radius: 0 2px 2px 0;
}

.priority-bar--0 {
  background-color: #42b983;
}

.priority-bar--1 {
  background-color: #6b7280;
}

.priority-bar--2 {
  background-color: #f59e0b;
}

.priority-bar--3 {
  background-color: #ef4444;
}

/* 移动端任务项内容 */
.mobile-task-item {
  display: flex;
  align-items: center;
  padding: 14px 12px 14px 16px;
  gap: 12px;
}

.mobile-checkbox {
  flex-shrink: 0;
}

.mobile-task-content {
  flex: 1;
  min-width: 0;
}

.mobile-task-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.mobile-task-title-row .task-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-task-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mobile-deadline {
  font-size: 12px;
  color: #6c757d;
  padding: 2px 8px;
  background-color: #f7f8fa;
  border-radius: 4px;
}

.mobile-deadline.overdue {
  color: #ef4444;
  background-color: #fef2f2;
}

.mobile-no-deadline {
  font-size: 12px;
  color: #9ca3af;
}
</style>

<!-- 无 scoped 样式块，用于覆盖子组件样式（兼容小程序） -->
<style lang="scss">
/* TaskList - 任务项包装器 */
.task-item-wrapper .uni-list-item {
  flex: 1;
}

/* TaskList - 列表项优化 */
.task-list .uni-list-item {
  transition: all 0.25s ease;
  overflow: visible !important;
}

.task-list .uni-list-item__container {
  overflow: visible !important;
}

.task-list .uni-list-item__content {
  overflow: visible !important;
}

.task-list .uni-list-item__extra {
  overflow: visible !important;
}

.task-list .uni-list {
  overflow: visible !important;
}

.task-list .uni-list--border {
  overflow: visible !important;
}

.task-list .uni-list-item:hover {
  background-color: #f0fdf7;
}

/* TaskList - Checkbox 样式优化 */
.task-list checkbox .uni-checkbox-input {
  border-color: #42b983 !important;
  border-width: 2px;
  transition: all 0.2s ease;
}

.task-list checkbox .uni-checkbox-input:hover {
  border-color: #359568 !important;
  background-color: #e6fcf5 !important;
}

.task-list checkbox .uni-checkbox-input.uni-checkbox-input-checked {
  background-color: #42b983 !important;
  border-color: #42b983 !important;
}

/* TaskList - 完成动画时 checkbox 变绿 */
.task-completing checkbox .uni-checkbox-input {
  background-color: #42b983 !important;
  border-color: #42b983 !important;
}

.task-completing checkbox .uni-checkbox-input::after {
  border-color: #fff !important;
}
</style> 