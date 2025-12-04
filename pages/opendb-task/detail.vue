<!--
 * 任务详情页面
 *
 * 功能说明：
 * - 查看和编辑任务完整信息
 * - 支持修改负责人、截止日期、优先级、分组
 * - 支持添加/管理子任务
 * - 支持上传/下载附件
 * - 支持任务评论（@提及成员）
 * - 支持完成/删除任务
 * - 显示父任务信息（如果是子任务）
 * - 响应式布局，适配移动端和PC端
 *
 * 路由：/pages/opendb-task/detail?id={taskId}&pid={projectId}
-->
<template>
	<view class="page-container">
		<!-- 下拉列表遮罩 -->
		<view v-if="showMainAssigneeDropdown || openSubTaskAssigneeId || showPriorityDropdown || showGroupDropdown" class="dropdown-backdrop" @click="closeAllDropdowns"></view>
		<!-- 自定义导航栏（仅移动端显示） -->
		<CustomNavBar v-if="!isWideScreen" title="任务详情" subtitle="">
			<template #right>
				<view class="nav-actions">
					<view class="nav-action-btn" @click="handleUpdate">
						<uni-icons type="compose" size="20" color="#42b983"></uni-icons>
					</view>
					<view class="nav-action-btn nav-action-btn--danger" @click="handleDelete">
						<uni-icons type="trash" size="20" color="#e74c3c"></uni-icons>
					</view>
				</view>
			</template>
		</CustomNavBar>

		<!-- PC端页面标题栏 -->
		<view v-else class="pc-page-header">
			<view class="pc-header-left">
				<view class="pc-back-btn" @click="goBack">
					<uni-icons type="left" size="18" color="#42b983"></uni-icons>
				</view>
				<text class="pc-title">任务详情</text>
			</view>
			<view class="pc-header-right">
				<view class="nav-action-btn" @click="handleUpdate">
					<uni-icons type="compose" size="20" color="#42b983"></uni-icons>
				</view>
				<view class="nav-action-btn nav-action-btn--danger" @click="handleDelete">
					<uni-icons type="trash" size="20" color="#e74c3c"></uni-icons>
				</view>
			</view>
		</view>

		<view class="content-wrapper">
			<unicloud-db ref="udb" v-slot:default="{data, loading, error, options}" :options="options"
				collection="opendb-task" field="title,content,assignee,deadline,status,priority,attachments,group_id,parent_id"
				:where="queryWhere" :getone="true" :manual="true" @load="handleLoad">

				<view v-if="error" class="error-card">
					<uni-icons type="info" size="24" color="#e74c3c"></uni-icons>
					<text class="error-text">{{error.message}}</text>
				</view>

				<view v-else-if="loading" class="loading-wrapper">
					<uni-load-more :contentText="loadMore" status="loading"></uni-load-more>
				</view>

				<view v-else-if="data" class="task-detail">
					<!-- 父任务链接 -->
					<view v-if="parentTask" class="parent-task-link" @click="goToParentTask">
						<text class="parent-task-label">父任务</text>
						<text class="parent-task-title">{{parentTask.title}}</text>
						<uni-icons type="right" size="14" color="#42b983"></uni-icons>
					</view>

					<!-- 任务标题卡片 -->
					<view class="card task-header-card">
						<view class="task-title-row">
							<checkbox-group @change="checkboxChange" class="checkbox-wrapper">
								<label class="task-title-label">
									<checkbox :checked="data.status==2" :value="data.status+''" class="task-checkbox" color="#42b983" />
									<text class="task-title" :class="{'task-completed': data.status==2}">{{data.title}}</text>
								</label>
							</checkbox-group>
						</view>

						<!-- 任务元信息 -->
						<view class="task-meta-grid">
							<!-- 负责人 -->
							<view class="meta-item">
								<view class="meta-label">
									<uni-icons type="contact" size="16" color="#6c757d"></uni-icons>
									<text>负责人</text>
								</view>
								<view class="meta-value">
									<view class="assignee-selector-wrapper">
										<view class="assignee-selector" @click.stop="toggleMainAssigneeDropdown">
											<view v-if="assignee && getAssigneeInfo(assignee)" class="assignee-avatar">
												<image v-if="getAssigneeInfo(assignee).avatar" :src="getAssigneeInfo(assignee).avatar" mode="aspectFill"></image>
												<text v-else class="avatar-text">{{getAssigneeInfo(assignee).text.slice(0,1)}}</text>
											</view>
											<view v-else class="assignee-placeholder">
												<uni-icons type="plusempty" size="16" color="#9ca3af"></uni-icons>
											</view>
											<text class="assignee-name">{{assignee ? getAssigneeInfo(assignee)?.text : '未分配'}}</text>
											<uni-icons type="bottom" size="12" color="#9ca3af"></uni-icons>
										</view>
										<!-- 负责人下拉选择 -->
										<view v-if="showMainAssigneeDropdown" class="assignee-dropdown" @click.stop>
											<view class="assignee-dropdown-search">
												<uni-icons type="search" size="16" color="#999"></uni-icons>
												<input
													type="text"
													v-model="mainAssigneeSearchKeyword"
													placeholder="搜索成员"
													class="assignee-search-input"
												/>
											</view>
											<scroll-view scroll-y class="assignee-dropdown-list">
												<!-- 无负责人选项 -->
												<view
													class="assignee-option"
													:class="{ 'assignee-option--selected': !assignee }"
													@click.stop="selectMainAssignee(null)"
												>
													<view class="assignee-option-avatar assignee-option-avatar--empty">
														<uni-icons type="person" size="20" color="#9ca3af"></uni-icons>
													</view>
													<text class="assignee-option-name">未分配</text>
													<uni-icons v-if="!assignee" type="checkmarkempty" size="16" color="#42b983"></uni-icons>
												</view>
												<!-- 成员列表 -->
												<view
													v-for="member in filteredMainAssigneeMembers"
													:key="member.value"
													class="assignee-option"
													:class="{ 'assignee-option--selected': assignee === member.value }"
													@click.stop="selectMainAssignee(member.value)"
												>
													<view v-if="member.avatar" class="assignee-option-avatar">
														<image :src="member.avatar" mode="aspectFill"></image>
													</view>
													<view v-else class="assignee-option-avatar assignee-option-avatar--text">
														<text>{{member.text.slice(0,1)}}</text>
													</view>
													<text class="assignee-option-name">{{member.text}}</text>
													<uni-icons v-if="assignee === member.value" type="checkmarkempty" size="16" color="#42b983"></uni-icons>
												</view>
											</scroll-view>
										</view>
									</view>
								</view>
							</view>

							<!-- 截止日期 -->
							<view class="meta-item">
								<view class="meta-label">
									<uni-icons type="calendar" size="16" color="#6c757d"></uni-icons>
									<text>截止日期</text>
								</view>
								<view class="meta-value">
									<view class="deadline-picker" :class="{'deadline-overdue': deadline && new Date(deadline) < new Date()}">
										<uni-datetime-picker type="date" v-model="deadline" @change="setDeadLine">
											<text class="deadline-text">{{deadline ? deadline : '设置日期'}}</text>
										</uni-datetime-picker>
									</view>
								</view>
							</view>

							<!-- 优先级 -->
							<view class="meta-item">
								<view class="meta-label">
									<uni-icons type="flag" size="16" color="#6c757d"></uni-icons>
									<text>优先级</text>
								</view>
								<view class="meta-value">
									<view class="priority-selector-wrapper">
										<view class="priority-selector" @click.stop="togglePriorityDropdown">
											<view class="priority-badge" :class="'priority-' + (priority)">
												{{priorityArray[priority]}}
											</view>
											<uni-icons type="bottom" size="12" color="#9ca3af"></uni-icons>
										</view>
										<!-- 优先级下拉选择 -->
										<view v-if="showPriorityDropdown" class="priority-dropdown" @click.stop>
											<view
												v-for="(item, index) in priorityArray"
												:key="index"
												class="priority-option"
												:class="{ 'priority-option--selected': priority === index }"
												@click.stop="selectPriority(index)"
											>
												<view class="priority-badge" :class="'priority-' + index">
													{{ item }}
												</view>
												<uni-icons v-if="priority === index" type="checkmarkempty" size="16" color="#42b983"></uni-icons>
											</view>
										</view>
									</view>
								</view>
							</view>

							<!-- 分组 -->
							<view class="meta-item">
								<view class="meta-label">
									<uni-icons type="folder" size="16" color="#6c757d"></uni-icons>
									<text>分组</text>
								</view>
								<view class="meta-value">
									<view class="group-selector-wrapper">
										<view class="group-selector" @click.stop="toggleGroupDropdown">
											<text class="group-name">{{ currentGroupName }}</text>
											<uni-icons type="bottom" size="12" color="#9ca3af"></uni-icons>
										</view>
										<!-- 分组下拉选择 -->
										<view v-if="showGroupDropdown" class="group-dropdown" @click.stop>
											<!-- 未分组选项 -->
											<view
												class="group-option"
												:class="{ 'group-option--selected': !groupId }"
												@click.stop="selectGroupInline(null)"
											>
												<text class="group-option-name">未分组</text>
												<uni-icons v-if="!groupId" type="checkmarkempty" size="16" color="#42b983"></uni-icons>
											</view>
											<!-- 分组列表 -->
											<view
												v-for="group in groups"
												:key="group._id"
												class="group-option"
												:class="{ 'group-option--selected': groupId === group._id }"
												@click.stop="selectGroupInline(group._id)"
											>
												<text class="group-option-name">{{ group.name }}</text>
												<uni-icons v-if="groupId === group._id" type="checkmarkempty" size="16" color="#42b983"></uni-icons>
											</view>
										</view>
									</view>
								</view>
							</view>
						</view>
					</view>

					<!-- 任务描述卡片 -->
					<view class="card">
						<view class="card-header">
							<uni-icons type="paperclip" size="18" color="#42b983"></uni-icons>
							<text class="card-title">任务描述</text>
						</view>
						<view class="card-body">
							<text class="task-description">{{data.content ? data.content : '暂无描述'}}</text>
						</view>
					</view>

					<!-- 附件卡片 -->
					<view class="card">
						<view class="card-header">
							<uni-icons type="paperclip" size="18" color="#42b983"></uni-icons>
							<text class="card-title">附件</text>
							<text class="card-badge" v-if="attachments.length > 0">{{attachments.length}}</text>
						</view>
						<view class="card-body">
							<view v-if="attachments && attachments.length > 0" class="attachment-grid">
								<!-- 图片附件 -->
								<view
									v-for="(item, index) in imageAttachments"
									:key="'img-' + index"
									class="attachment-grid-item image-attachment-item"
									@click="previewImage(item.url, index)"
								>
									<image :src="item.url" mode="aspectFill" class="image-thumbnail"></image>
									<view class="image-overlay">
										<uni-icons type="eye" size="20" color="#fff"></uni-icons>
									</view>
									<view class="image-delete" @click.stop="delFile(item, attachments.indexOf(item))">
										<uni-icons type="closeempty" size="14" color="#fff"></uni-icons>
									</view>
								</view>

								<!-- 非图片附件 -->
								<view
									v-for="(item, index) in nonImageAttachments"
									:key="'file-' + index"
									class="attachment-grid-item file-attachment-item"
								>
									<view class="file-icon-wrapper" :class="'file-icon--' + getFileType(item)">
										<image v-if="getFileType(item) === 'pdf'" class="file-type-icon" src="/static/icons/pdf.svg" mode="aspectFit"></image>
										<image v-else-if="getFileType(item) === 'word'" class="file-type-icon" src="/static/icons/word.svg" mode="aspectFit"></image>
										<image v-else-if="getFileType(item) === 'excel'" class="file-type-icon" src="/static/icons/excel.svg" mode="aspectFit"></image>
										<image v-else-if="getFileType(item) === 'ppt'" class="file-type-icon" src="/static/icons/ppt.svg" mode="aspectFit"></image>
										<image v-else-if="getFileType(item) === 'zip'" class="file-type-icon" src="/static/icons/zip.svg" mode="aspectFit"></image>
										<image v-else-if="getFileType(item) === 'video'" class="file-type-icon" src="/static/icons/video.svg" mode="aspectFit"></image>
										<image v-else-if="getFileType(item) === 'audio'" class="file-type-icon" src="/static/icons/audio.svg" mode="aspectFit"></image>
										<image v-else-if="getFileType(item) === 'text'" class="file-type-icon" src="/static/icons/text.svg" mode="aspectFit"></image>
										<image v-else class="file-type-icon" src="/static/icons/file.svg" mode="aspectFit"></image>
									</view>
									<text class="file-name">{{item.name}}</text>
									<!-- #ifdef H5 -->
									<view class="file-actions">
										<text class="file-action" @click="downloadFile(item.url)">下载</text>
										<text class="file-action file-action--danger" @click="delFile(item, attachments.indexOf(item))">删除</text>
									</view>
									<!-- #endif -->
								</view>
							</view>
							<view v-else class="empty-placeholder">
								<text>暂无附件</text>
							</view>

							<uni-file-picker v-model="files" limit="9" file-mediatype="all" return-type="array"
								@success="uploadSuccess" @select="fileSelect" @delete="fileDel" class="file-picker">
								<button class="upload-btn">
									<uni-icons type="plusempty" size="14" color="#42b983"></uni-icons>
									<text>上传附件</text>
								</button>
							</uni-file-picker>
						</view>
					</view>
				</view>
			</unicloud-db>

			<!-- 子任务卡片 -->
			<view class="card">
				<view class="card-header">
					<uni-icons type="list" size="18" color="#42b983"></uni-icons>
					<text class="card-title">子任务</text>
					<text class="card-badge" v-if="subTasks.length > 0">{{completedSubTasksCount}}/{{subTasks.length}}</text>
					<view class="card-header-action" @click="enableAddSub">
						<uni-icons type="plusempty" size="14" color="#42b983"></uni-icons>
						<text>添加</text>
					</view>
				</view>
				<view class="card-body">
					<view v-if="subTasks.length === 0 && !addSubStatus" class="empty-placeholder">
						<text>暂无子任务</text>
					</view>

					<view class="subtask-list">
						<view v-for="(item, index) in subTasks" :key="index" class="subtask-item">
							<!-- 编辑模式 -->
							<view v-if="editingSubTaskId === item._id" class="subtask-edit-form">
								<view class="checkbox-placeholder"></view>
								<input
									type="text"
									v-model="editTaskContent"
									placeholder="输入标题，回车保存，ESC取消"
									class="add-subtask-input"
									:focus="true"
									@confirm="saveSubTaskEdit"
									@blur="handleEditBlur"
								/>
							</view>
							<!-- 显示模式 -->
							<template v-else>
								<view class="subtask-main">
									<checkbox
										@click.stop="finish(item)"
										:checked="item.status > 0"
										class="subtask-checkbox"
										color="#42b983"
									/>
									<view class="subtask-content">
										<text class="subtask-title" :class="{'task-completed': item.status > 0}">
											{{item.title}}
										</text>
										<view v-if="item.status == 2 && item.completion_uid && item.completion_uid.length > 0" class="subtask-completion">
											{{item.completion_uid[0].nickname}} 于 {{formatDate(item.completion_date)}} 完成
										</view>
									</view>
								</view>

								<view v-if="!item.status" class="subtask-meta">
									<!-- 截止日期 -->
									<view class="subtask-deadline"
										:class="{'deadline-overdue': item.deadline && new Date(item.deadline) < new Date()}"
										@click.stop="setCurrentTaskId(item._id)">
										<picker mode="date" :value="formatDateForPicker(item.deadline)" @change="bindDateChange">
											<text>{{item.deadline ? formatDate(item.deadline) : '设置日期'}}</text>
										</picker>
									</view>

									<!-- 负责人 -->
									<view class="subtask-assignee-wrapper">
										<view class="subtask-assignee" @click.stop="toggleSubTaskAssigneeDropdown(item._id, item.assignee[0]?._id)">
											<text v-if="item.assignee?.length > 0">{{item.assignee[0].nickname}}</text>
											<uni-icons v-else type="contact" size="16" color="#6c757d"></uni-icons>
										</view>
										<!-- 子任务负责人下拉选择 -->
										<view v-if="openSubTaskAssigneeId === item._id" class="subtask-assignee-dropdown" @click.stop>
											<scroll-view scroll-y class="subtask-assignee-dropdown-list">
												<!-- 无负责人选项 -->
												<view
													class="assignee-option"
													:class="{ 'assignee-option--selected': !item.assignee?.length }"
													@click.stop="selectSubTaskAssignee(item._id, null)"
												>
													<view class="assignee-option-avatar assignee-option-avatar--empty">
														<uni-icons type="person" size="16" color="#9ca3af"></uni-icons>
													</view>
													<text class="assignee-option-name">未分配</text>
													<uni-icons v-if="!item.assignee?.length" type="checkmarkempty" size="14" color="#42b983"></uni-icons>
												</view>
												<!-- 成员列表 -->
												<view
													v-for="member in members"
													:key="member.value"
													class="assignee-option"
													:class="{ 'assignee-option--selected': item.assignee?.[0]?._id === member.value }"
													@click.stop="selectSubTaskAssignee(item._id, member.value)"
												>
													<view v-if="member.avatar" class="assignee-option-avatar">
														<image :src="member.avatar" mode="aspectFill"></image>
													</view>
													<view v-else class="assignee-option-avatar assignee-option-avatar--text">
														<text>{{member.text.slice(0,1)}}</text>
													</view>
													<text class="assignee-option-name">{{member.text}}</text>
													<uni-icons v-if="item.assignee?.[0]?._id === member.value" type="checkmarkempty" size="14" color="#42b983"></uni-icons>
												</view>
											</scroll-view>
										</view>
									</view>

									<!-- 操作按钮 -->
									<view class="subtask-actions">
										<uni-icons type="compose" size="16" color="#6c757d" @click="startInlineEdit(item._id, item.title)"></uni-icons>
										<uni-icons type="trash" size="16" color="#e74c3c" @click="delSubTask(item._id)"></uni-icons>
									</view>
								</view>
							</template>
						</view>

						<!-- 添加子任务输入框 -->
						<view v-if="addSubStatus" class="add-subtask-form">
							<view class="checkbox-placeholder"></view>
							<input
								ref="subTaskInput"
								type="text"
								v-model="subTaskForm.title"
								placeholder="输入标题，回车创建，ESC取消"
								class="add-subtask-input"
								:focus="subTaskInputFocus"
								@confirm="addSubTask"
							/>
						</view>
					</view>
				</view>
			</view>

			<!-- 评论区卡片 -->
			<view class="card">
				<view class="card-header">
					<uni-icons type="chatbubble" size="18" color="#42b983"></uni-icons>
					<text class="card-title">评论</text>
					<text class="card-badge" v-if="commentList.length > 0">{{commentList.length}}</text>
				</view>
				<view class="card-body">
					<view v-if="commentList.length === 0" class="empty-placeholder">
						<text>暂无评论，快来发表第一条评论吧</text>
					</view>

					<view class="comment-list">
						<view v-for="(item, index) in commentList" :key="index" class="comment-item">
							<view class="comment-avatar">
								<text>{{item.user_id[0].nickname.slice(0, 1)}}</text>
							</view>
							<view class="comment-content">
								<view class="comment-header">
									<text class="comment-author">{{item.user_id[0].nickname}}</text>
									<view class="comment-actions" v-if="isCommentAuthor(item.user_id[0]._id)">
										<uni-icons type="compose" size="14" color="#6c757d" @click="openCommentPopup(item._id, item.content)"></uni-icons>
										<uni-icons type="trash" size="14" color="#e74c3c" @click="delComment(item._id)"></uni-icons>
									</view>
								</view>
								<view class="comment-text">
									<text
										v-for="(part, index) in parseCommentContent(item.content)"
										:key="index"
										:class="part.type === 'mention' ? 'comment-mention' : ''"
									>{{ part.content }}</text>
								</view>
							</view>
						</view>
					</view>

					<!-- 发表评论 -->
					<view class="comment-form">
						<textarea
							placeholder="写下你的评论，输入@提及成员..."
							class="comment-textarea"
							v-model="comment"
							@input="handleCommentInput"
						></textarea>

						<!-- @成员选择弹出层 -->
						<view v-if="showMentionList" class="mention-list">
							<view class="mention-list-header">
								<text class="mention-list-title">选择成员</text>
								<uni-icons type="closeempty" size="18" color="#6c757d" @click="closeMentionList"></uni-icons>
							</view>
							<view v-if="filteredMembers.length === 0" class="mention-empty">
								<text>未找到匹配的成员</text>
							</view>
							<scroll-view v-else scroll-y class="mention-scroll">
								<view
									v-for="member in filteredMembers"
									:key="member.value"
									class="mention-item"
									@click="selectMention(member)"
								>
									<view class="mention-avatar">
										<text>{{ member.text.slice(0, 1) }}</text>
									</view>
									<text class="mention-name">{{ member.text }}</text>
								</view>
							</scroll-view>
						</view>

						<button class="comment-submit-btn" @click="addComment">
							发表评论
						</button>
					</view>
				</view>
			</view>

			<!-- 任务动态卡片 -->
			<view class="card">
				<view class="card-header">
					<uni-icons type="loop" size="18" color="#42b983"></uni-icons>
					<text class="card-title">任务动态</text>
					<text class="card-badge" v-if="taskLogs.length > 0">{{taskLogs.length}}</text>
				</view>
				<view class="card-body">
					<view v-if="taskLogs.length === 0" class="empty-placeholder">
						<text>暂无动态记录</text>
					</view>

					<view class="activity-list">
						<view v-for="(log, index) in taskLogs" :key="log._id" class="activity-item">
							<view class="activity-icon" :class="'activity-icon--' + log.action_type">
								<uni-icons :type="getActionIcon(log.action_type)" size="14" color="#fff"></uni-icons>
							</view>
							<view class="activity-content">
								<view class="activity-text">
									<text class="activity-user">{{log.user_id?.[0]?.nickname || '未知用户'}}</text>
									<text class="activity-action">{{log.action_detail}}</text>
								</view>
								<text class="activity-time">{{formatLogTime(log.create_time)}}</text>
							</view>
						</view>
					</view>
				</view>
			</view>
		</view>

		<!-- 修改子任务弹出层 -->
		<uni-popup ref="popup-task-edit" type="center" background-color="#fff">
			<view class="popup-container">
				<view class="popup-header">
					<text class="popup-title">修改子任务</text>
				</view>
				<view class="popup-body">
					<textarea class="popup-textarea" v-model="editTaskContent" placeholder="输入子任务内容"></textarea>
				</view>
				<view class="popup-footer">
					<button class="popup-btn popup-btn--primary" @click="editSubTask">确定</button>
					<button class="popup-btn popup-btn--default" @click="cancelEditTask">取消</button>
				</view>
			</view>
		</uni-popup>

		<!-- 设置负责人弹出层（子任务用） -->
		<uni-popup ref="popup-assignee-set" type="center" background-color="#fff">
			<view class="popup-container">
				<view class="popup-header">
					<text class="popup-title">设置负责人</text>
				</view>
				<view class="popup-body popup-body--center">
					<uni-data-select
						class="popup-select"
						:clear-icon="false"
						v-model="currentTaskAssignee"
						:localdata="members"
						placeholder="选择负责人">
					</uni-data-select>
				</view>
				<view class="popup-footer">
					<button class="popup-btn popup-btn--primary" @click="setAssignee()">确定</button>
					<button class="popup-btn popup-btn--default" @click="cancelAssign()">取消</button>
				</view>
			</view>
		</uni-popup>

		<!-- 修改评论弹出层 -->
		<uni-popup ref="popup-comment-edit" type="center" background-color="#fff">
			<view class="popup-container">
				<view class="popup-header">
					<text class="popup-title">修改评论</text>
				</view>
				<view class="popup-body">
					<textarea class="popup-textarea" v-model="editCommentContent" placeholder="输入评论内容"></textarea>
				</view>
				<view class="popup-footer">
					<button class="popup-btn popup-btn--primary" @click="editComment">确定</button>
					<button class="popup-btn popup-btn--default" @click="cancelEditComment">取消</button>
				</view>
			</view>
		</uni-popup>

		<!-- 分组选择弹窗 -->
		<uni-popup ref="popup-group-select" type="center" background-color="#fff">
			<view class="popup-container assignee-popup-container">
				<view class="popup-header">
					<text class="popup-title">选择分组</text>
				</view>
				<view class="popup-body">
					<view class="member-grid">
						<!-- 无分组选项 -->
						<view
							class="member-option"
							:class="{'member-option--selected': !groupId}"
							@click="selectGroup('')"
						>
							<view class="group-option-icon">
								<uni-icons type="minus" size="16" color="#9ca3af"></uni-icons>
							</view>
							<text class="member-option-name">无分组</text>
							<uni-icons v-if="!groupId" type="checkmarkempty" size="16" color="#42b983"></uni-icons>
						</view>
						<!-- 分组列表 -->
						<view
							v-for="group in groups"
							:key="group._id"
							class="member-option"
							:class="{'member-option--selected': groupId === group._id}"
							@click="selectGroup(group._id)"
						>
							<view class="group-option-icon">
								<uni-icons type="folder" size="16" color="#42b983"></uni-icons>
							</view>
							<text class="member-option-name">{{ group.name }}</text>
							<uni-icons v-if="groupId === group._id" type="checkmarkempty" size="16" color="#42b983"></uni-icons>
						</view>
					</view>
				</view>
				<view class="popup-footer">
					<button class="popup-btn popup-btn--default" @click="closeGroupPopup">取消</button>
				</view>
			</view>
		</uni-popup>
	</view>
</template>

<script>
	import CustomNavBar from '@/components/CustomNavBar/CustomNavBar.vue'
	import {
		enumConverter,
		priorityOptions
	} from '@/js_sdk/validator/opendb-task.js';
	import { formatDate, formatDateTime } from '@/utils/date.js'
	import { responsiveMixin } from '@/utils/responsive.js'
	import { getCurrentUserId } from '@/utils/auth.js'

	const projectObj = uniCloud.importObject('project-co')
	const taskObj = uniCloud.importObject('task-co')

	export default {
		components: {
			CustomNavBar
		},
		mixins: [responsiveMixin],
		data() {
			return {
				queryWhere: '',
				taskId: '',
				projectId: '',
				detailLoaded: false,
				priorityArray: priorityOptions.map(p => p.text),
				loadMore: {
					contentdown: '',
					contentrefresh: '',
					contentnomore: ''
				},
				options: {
					...enumConverter
				},
				members: [],
				assignee: '',
				deadline: '',
				oldDeadline: '',
				attachments: [],
				files: [],
				subTasks: [],
				addSubStatus: false,
				subTaskForm: {
					title: '',
					assignee: '',
					deadline: '',
					priority: ''
				},
				subTaskInputFocus: false,
				editTaskId: "",
				editTaskContent: '',
				editingSubTaskId: '',
				commentList: [],
				comment: '',
				editCommentId: '',
				editCommentContent: '',
				currentTaskId: '',
				currentTaskAssignee: '',
				taskLogs: [],
				groups: [],
				groupId: '',
				currentUserId: '',
				// @提及功能相关
				showMentionList: false,
				mentionKeyword: '',
				mentionPosition: 0,
				mentionedUsers: [],
				// 主任务负责人下拉选择
				showMainAssigneeDropdown: false,
				mainAssigneeSearchKeyword: '',
				// 子任务负责人下拉选择
				openSubTaskAssigneeId: '',
				// 父任务信息
				parentTask: null,
				// 优先级下拉选择
				showPriorityDropdown: false,
				priority: 0,
				// 分组下拉选择
				showGroupDropdown: false
			}
		},
		computed: {
			completedSubTasksCount() {
				return this.subTasks.filter(task => task.status > 0).length
			},
			filteredMainAssigneeMembers() {
				if (!this.mainAssigneeSearchKeyword) {
					return this.members
				}
				const keyword = this.mainAssigneeSearchKeyword.toLowerCase()
				return this.members.filter(member =>
					member.text.toLowerCase().includes(keyword)
				)
			},
			currentGroupName() {
				if (!this.groupId) return '无分组'
				const group = this.groups.find(g => g._id === this.groupId)
				return group ? group.name : '无分组'
			},
			// 图片附件
			imageAttachments() {
				const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']
				return this.attachments.filter(item => {
					const ext = (item.extname || item.name?.split('.').pop() || '').toLowerCase()
					return imageExts.includes(ext)
				})
			},
			// 非图片附件
			nonImageAttachments() {
				const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']
				return this.attachments.filter(item => {
					const ext = (item.extname || item.name?.split('.').pop() || '').toLowerCase()
					return !imageExts.includes(ext)
				})
			},
			// 过滤后的成员列表（用于@提及）
			filteredMembers() {
				if (!this.mentionKeyword) {
					return this.members
				}
				const keyword = this.mentionKeyword.toLowerCase()
				return this.members.filter(m =>
					m.text.toLowerCase().includes(keyword)
				)
			}
		},
		onLoad(e) {
			this.taskId = e.id
			this.projectId = e.pid
			let self = this;

			// 获取当前用户ID
			this.currentUserId = getCurrentUserId()

			// #ifdef H5
			document.addEventListener('keydown', function(event) {
				if (self.addSubStatus) {
					// 只处理ESC键，回车由 input 的 @confirm 事件处理
					if (event.keyCode === 27) {
						self.addSubStatus = false
					}
				}
			});
			// #endif
		},
		onReady() {
			if (this.taskId) {
				this.queryWhere = '_id=="' + this.taskId + '"'
			}
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

			handleLoad(data, ended, pagination) {
				this.detailLoaded = true
				this.assignee = data.assignee ? data.assignee : ''
				this.deadline = data.deadline ? this.formatDate(data.deadline) : '';
				this.oldDeadline = this.deadline;
				this.attachments = data.attachments ? data.attachments : [];
				this.groupId = data.group_id ? data.group_id : '';
				this.priority = data.priority || 0;

				let fileList = []
				this.attachments.forEach(item => {
					fileList.push(item.fileID)
				})

				if(fileList.length > 0) {
					uniCloud.getTempFileURL({
						fileList: fileList
					}).then(res => {
						res.fileList.forEach((item, index) => {
							this.attachments[index].url = item.tempFileURL
						})
					}).catch(e => {
						console.error('getTempFileURL error', e);
					})
				}

				// 如果有父任务，加载父任务信息
				if (data.parent_id) {
					this.loadParentTask(data.parent_id)
				} else {
					this.parentTask = null
				}

				this.loadSubTask();
				this.getMembersList();
				this.loadComments();
				this.loadTaskLogs();
				this.loadGroups();
			},

			// 加载父任务信息
			async loadParentTask(parentId) {
				try {
					const res = await uniCloud.database().collection('opendb-task')
						.doc(parentId)
						.field('_id,title')
						.get()
					if (res.result.data && res.result.data.length > 0) {
						this.parentTask = res.result.data[0]
					}
				} catch (e) {
					console.error('加载父任务失败:', e)
				}
			},

			// 跳转到父任务
			goToParentTask() {
				if (!this.parentTask) return
				uni.redirectTo({
					url: `/pages/opendb-task/detail?id=${this.parentTask._id}&pid=${this.projectId}`
				})
			},

			loadSubTask() {
				const task = uniCloud.database().collection('opendb-task').where({
					parent_id: this.taskId
				}).orderBy('create_date').getTemp()

				const users = uniCloud.database().collection('uni-id-users').field("_id,nickname").getTemp()

				uniCloud.database().collection(task, users).get().then(res => {
					this.subTasks = res.result.data
				})
			},

			async getMembersList() {
				try {
					const res = await projectObj.getMembersList(this.projectId)
					this.members = res.map(item => ({
						value: item._id,
						text: item.nickname
					}));
				} catch (e) {
					console.error("getMembersList err", e);
				}
			},

			loadComments() {
				const comment = uniCloud.database().collection('task-comments').where({
					task_id: this.taskId
				}).orderBy('create_date').getTemp()

				const users = uniCloud.database().collection('uni-id-users').field("_id,nickname").getTemp()

				uniCloud.database().collection(comment, users).get().then(res => {
					this.commentList = res.result.data
				})
			},

			// 加载任务动态
			loadTaskLogs() {
				const logs = uniCloud.database().collection('opendb-task-logs').where({
					task_id: this.taskId
				}).orderBy('create_time desc').getTemp()

				const users = uniCloud.database().collection('uni-id-users').field("_id,nickname").getTemp()

				uniCloud.database().collection(logs, users).get().then(res => {
					this.taskLogs = res.result.data
				}).catch(e => {
					console.error('loadTaskLogs error', e)
				})
			},

			// 获取动作图标
			getActionIcon(actionType) {
				const iconMap = {
					create: 'plusempty',
					update: 'compose',
					delete: 'trash',
					complete: 'checkmarkempty'
				}
				return iconMap[actionType] || 'info'
			},

			// 格式化日志时间
			formatLogTime(timestamp) {
				if (!timestamp) return ''
				const date = new Date(timestamp)
				const now = new Date()
				const diff = now - date

				// 1分钟内
				if (diff < 60 * 1000) {
					return '刚刚'
				}
				// 1小时内
				if (diff < 60 * 60 * 1000) {
					return Math.floor(diff / (60 * 1000)) + '分钟前'
				}
				// 24小时内
				if (diff < 24 * 60 * 60 * 1000) {
					return Math.floor(diff / (60 * 60 * 1000)) + '小时前'
				}
				// 7天内
				if (diff < 7 * 24 * 60 * 60 * 1000) {
					return Math.floor(diff / (24 * 60 * 60 * 1000)) + '天前'
				}
				// 超过7天显示具体日期
				const month = (date.getMonth() + 1).toString().padStart(2, '0')
				const day = date.getDate().toString().padStart(2, '0')
				const hours = date.getHours().toString().padStart(2, '0')
				const minutes = date.getMinutes().toString().padStart(2, '0')
				return `${month}-${day} ${hours}:${minutes}`
			},

			// 获取负责人信息
			getAssigneeInfo(assigneeId) {
				return this.members.find(m => m.value === assigneeId)
			},

			// 切换主任务负责人下拉列表
			toggleMainAssigneeDropdown() {
				this.showMainAssigneeDropdown = !this.showMainAssigneeDropdown
				if (this.showMainAssigneeDropdown) {
					this.mainAssigneeSearchKeyword = ''
				}
			},

			// 关闭主任务负责人下拉列表
			closeMainAssigneeDropdown() {
				this.showMainAssigneeDropdown = false
				this.mainAssigneeSearchKeyword = ''
			},

			// 选择主任务负责人（下拉列表方式，乐观更新）
			selectMainAssignee(memberId) {
				// 保存旧值用于回滚
				const oldAssignee = this.assignee

				// 立即更新 UI 并关闭下拉列表
				this.assignee = memberId
				this.closeMainAssigneeDropdown()

				// 异步更新后端
				uniCloud.database().collection('opendb-task').doc(this.taskId).update({
					assignee: memberId
				}).then(() => {
					// 数据库触发器会自动记录日志，延迟刷新动态列表
					setTimeout(() => {
						this.loadTaskLogs()
					}, 500)
				}).catch(e => {
					// 更新失败，回滚
					this.assignee = oldAssignee
					uni.showToast({ title: '设置失败，已恢复', icon: 'none' })
				})
			},

			// 关闭所有下拉列表
			closeAllDropdowns() {
				this.closeMainAssigneeDropdown()
				this.closeSubTaskAssigneeDropdown()
				this.closePriorityDropdown()
				this.closeGroupDropdown()
			},

			// 优先级下拉选择相关方法
			togglePriorityDropdown() {
				this.showPriorityDropdown = !this.showPriorityDropdown
				if (this.showPriorityDropdown) {
					// 关闭其他下拉列表
					this.closeMainAssigneeDropdown()
					this.closeSubTaskAssigneeDropdown()
					this.closeGroupDropdown()
				}
			},

			closePriorityDropdown() {
				this.showPriorityDropdown = false
			},

			selectPriority(priorityValue) {
				// 如果相同则不更新
				if (this.priority === priorityValue) {
					this.closePriorityDropdown()
					return
				}

				// 保存旧值用于回滚
				const oldPriority = this.priority

				// 立即更新 UI 并关闭下拉列表
				this.priority = priorityValue
				this.closePriorityDropdown()

				// 异步更新后端
				uniCloud.database().collection('opendb-task').doc(this.taskId).update({
					priority: priorityValue
				}).then(() => {
					// 刷新动态列表
					setTimeout(() => {
						this.loadTaskLogs()
					}, 500)
				}).catch(e => {
					// 更新失败，回滚
					this.priority = oldPriority
					uni.showToast({ title: '设置失败，已恢复', icon: 'none' })
				})
			},

			// 分组下拉选择相关方法
			toggleGroupDropdown() {
				this.showGroupDropdown = !this.showGroupDropdown
				if (this.showGroupDropdown) {
					// 关闭其他下拉列表
					this.closeMainAssigneeDropdown()
					this.closeSubTaskAssigneeDropdown()
					this.closePriorityDropdown()
				}
			},

			closeGroupDropdown() {
				this.showGroupDropdown = false
			},

			selectGroupInline(groupIdValue) {
				// 如果相同则不更新
				if (this.groupId === groupIdValue) {
					this.closeGroupDropdown()
					return
				}

				// 保存旧值用于回滚
				const oldGroupId = this.groupId

				// 立即更新 UI 并关闭下拉列表
				this.groupId = groupIdValue
				this.closeGroupDropdown()

				// 异步更新后端
				uniCloud.database().collection('opendb-task').doc(this.taskId).update({
					group_id: groupIdValue
				}).then(() => {
					// 刷新动态列表
					setTimeout(() => {
						this.loadTaskLogs()
					}, 500)
				}).catch(e => {
					// 更新失败，回滚
					this.groupId = oldGroupId
					uni.showToast({ title: '设置失败，已恢复', icon: 'none' })
				})
			},

			// 切换子任务负责人下拉列表
			toggleSubTaskAssigneeDropdown(taskId, currentAssigneeId) {
				if (this.openSubTaskAssigneeId === taskId) {
					this.closeSubTaskAssigneeDropdown()
				} else {
					// 关闭其他下拉列表
					this.closeMainAssigneeDropdown()
					this.openSubTaskAssigneeId = taskId
				}
			},

			// 关闭子任务负责人下拉列表
			closeSubTaskAssigneeDropdown() {
				this.openSubTaskAssigneeId = ''
			},

			// 选择子任务负责人（乐观更新）
			selectSubTaskAssignee(taskId, memberId) {
				const index = this.subTasks.findIndex(t => t._id === taskId)
				if (index === -1) return

				// 保存旧值用于回滚
				const oldAssignee = this.subTasks[index].assignee ? [...this.subTasks[index].assignee] : []

				// 立即更新 UI 并关闭下拉列表
				if (memberId) {
					const member = this.members.find(m => m.value === memberId)
					this.subTasks[index].assignee = [{ _id: memberId, nickname: member?.text || '未知' }]
				} else {
					this.subTasks[index].assignee = []
				}
				this.closeSubTaskAssigneeDropdown()

				// 异步更新后端
				uniCloud.database().collection('opendb-task').doc(taskId).update({
					assignee: memberId
				}).catch(e => {
					// 更新失败，回滚
					this.subTasks[index].assignee = oldAssignee
					uni.showToast({ title: '设置失败，已恢复', icon: 'none' })
				})
			},

			downloadFile(url) {
				window.open(url)
			},

			// 获取文件类型
			getFileType(item) {
				const ext = (item.extname || item.name?.split('.').pop() || '').toLowerCase()

				// PDF
				if (ext === 'pdf') return 'pdf'

				// Word 文档
				if (['doc', 'docx'].includes(ext)) return 'word'

				// Excel 表格
				if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel'

				// PPT 演示
				if (['ppt', 'pptx'].includes(ext)) return 'ppt'

				// 压缩包
				if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'zip'

				// 视频
				if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(ext)) return 'video'

				// 音频
				if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) return 'audio'

				// 文本/代码
				if (['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts', 'vue', 'py', 'java', 'c', 'cpp', 'h'].includes(ext)) return 'text'

				// 默认文件
				return 'file'
			},

			// 预览图片
			previewImage(url, index) {
				const imageUrls = this.imageAttachments.map(item => item.url)
				uni.previewImage({
					current: index,
					urls: imageUrls
				})
			},

			delFile(item, index) {
				taskObj.deleteAttachment(this.taskId, index, item).then(e => {
					this.attachments.splice(index, 1)
				}).catch(e => {
					console.error('deleteAttachment error', e);
				})
			},

			uploadSuccess(e) {
				e.tempFiles.forEach(file => {
					const {extname, name, path, size, fileID} = file;
					this.attachments.push({
						extname, name, path, size, fileID,
						url: file.url
					})
				})
				uniCloud.database().collection('opendb-task').doc(this.taskId).update({
					'attachments': this.attachments
				}).then((e) => {
					this.files = []
				}).catch((e) => {
					console.log('set attachments fail', e);
				})
			},

			fileDel(e) {
				console.log("file delete", e);
			},

			fileSelect(e) {
				console.log("file select", e);
			},

			handleUpdate() {
				uni.navigateTo({
					url: '/pages/opendb-task/edit?id=' + this.taskId,
					events: {
						refreshData: () => {
							this.$refs.udb.loadData({ clear: true })
							this.getOpenerEventChannel().emit('refreshTaskList')
						}
					}
				})
			},

			bindPriorityChange: function(e) {
				uniCloud.database().collection('opendb-task').doc(this.taskId).update({
					'priority': e.detail.value
				}).then(() => {
					uni.showToast({ title: '优先级已更新', icon: 'success' })
					// 刷新数据
					this.$refs.udb.loadData({ clear: true })
				}).catch((e) => {
					uni.showModal({
						title: '设置优先级失败',
						content: e.message,
						showCancel: false
					})
				})
			},

			bindAssigneeChange: function(e) {
				console.log(e);
			},

			formatDate,

			// 将时间戳格式化为 picker 需要的 yyyy-MM-dd 格式
			formatDateForPicker(timestamp) {
				return formatDate(timestamp)
			},

			handleDelete() {
				uni.showModal({
					title: '删除确认',
					content: '确认删除此任务吗？此操作不可撤销。',
					confirmColor: '#e74c3c',
					success: (res) => {
						if (res.confirm) {
							uniCloud.database().collection('opendb-task').doc(this.taskId).remove().then(e => {
								uni.showToast({ title: '任务已删除', icon: 'success' })
								setTimeout(() => {
									uni.navigateTo({
										url: '/pages/opendb-task/list?id=' + this.projectId
									})
								}, 500)
							})
						}
					}
				})
			},

			async checkboxChange(e) {
				const newStatus = e.detail.value.length > 0 ? 2 : 0
				try {
					const taskObj = uniCloud.importObject('task-co')
					const res = await taskObj.changeState(this.taskId, newStatus)
					if (res.errCode && res.errCode !== 0) {
						throw new Error(res.errMsg || '操作失败')
					}
					uni.showToast({
						title: newStatus === 2 ? '任务已完成' : '任务已重新打开',
						icon: 'success'
					})
					// 刷新任务数据
					this.$refs.udb && this.$refs.udb.loadData({ clear: true })
				} catch (err) {
					console.error('更新任务状态失败:', err)
					uni.showToast({
						title: '操作失败',
						icon: 'none'
					})
				}
			},

			addComment() {
				if (!this.comment.trim()) {
					uni.showToast({ title: '请输入评论内容', icon: 'none' })
					return
				}
				uni.showLoading({})

				// 构建评论数据
				const commentData = {
					task_id: this.taskId,
					content: this.comment
				}

				// 添加被@的用户ID列表
				if (this.mentionedUsers.length > 0) {
					commentData.mentioned_users = this.mentionedUsers.map(u => u.value)
				}

				uniCloud.database().collection("task-comments").add(commentData).then(e => {
					this.comment = ''
					this.mentionedUsers = []
					uni.hideLoading()
					uni.showToast({ title: '评论发表成功', icon: 'success' })
					this.loadComments()
				})
			},

			enableAddSub() {
				this.addSubStatus = true
				// 下一帧设置焦点
				this.$nextTick(() => {
					this.subTaskInputFocus = true
				})
			},

			addSubTask() {
				if (!this.subTaskForm.title.trim()) {
					this.addSubStatus = false
					this.subTaskInputFocus = false
					return
				}
				const subTaskTitle = this.subTaskForm.title
				// 清空输入框
				this.subTaskForm.title = ''

				// 生成临时 ID，用于乐观更新
				const tempId = 'temp_' + Date.now()

				// 立即在前端添加新子任务（乐观更新）
				this.subTasks.push({
					_id: tempId,
					title: subTaskTitle,
					status: 0,
					parent_id: this.taskId,
					assignee: []
				})

				// 重新聚焦输入框
				this.subTaskInputFocus = false
				this.$nextTick(() => {
					this.subTaskInputFocus = true
				})

				// 后台异步写入数据库
				uniCloud.database().collection('opendb-task').add({
					parent_id: this.taskId,
					title: subTaskTitle,
					project_id: this.projectId
				}).then(e => {
					// 更新临时 ID 为真实 ID
					const realId = e.result?.id || e.result?._id || e.id || e._id
					const index = this.subTasks.findIndex(t => t._id === tempId)
					if (index !== -1 && realId) {
						this.subTasks[index]._id = realId
					}
					// 数据库触发器会自动记录日志，延迟刷新确保触发器完成
					setTimeout(() => {
						this.loadTaskLogs()
					}, 500)
				}).catch(e => {
					// 写入失败，移除乐观更新的数据
					const index = this.subTasks.findIndex(t => t._id === tempId)
					if (index !== -1) {
						this.subTasks.splice(index, 1)
					}
					if (e.code == "TOKEN_INVALID_TOKEN_EXPIRED") {
						uni.showModal({
							title: '添加子任务失败',
							content: '登录状态已过期，请重新登录',
							confirmText: '重新登录',
							success: (res) => {
								if (res.confirm) {
									uni.navigateTo({
										url: '/uni_modules/uni-id-pages/pages/login/login-withpwd'
									})
								}
							}
						})
					} else {
						uni.showToast({ title: '添加失败', icon: 'none' })
					}
				})
			},

			delSubTask(id) {
				// 检查任务 ID 是否有效
				if (!id || id.startsWith('temp_')) {
					uni.showToast({ title: '任务正在保存中，请稍后', icon: 'none' })
					return
				}
				uni.showModal({
					title: '删除确认',
					content: '确认删除此子任务吗？',
					confirmColor: '#e74c3c',
					success: (res) => {
						if (res.confirm) {
							uniCloud.database().collection('opendb-task').doc(id).remove().then(e => {
								uni.showToast({ title: '子任务已删除', icon: 'success' })
								this.loadSubTask();
							})
						}
					}
				})
			},

			// 开始内联编辑子任务
			startInlineEdit(id, title) {
				// 检查任务 ID 是否有效
				if (!id || id.startsWith('temp_')) {
					uni.showToast({ title: '任务正在保存中，请稍后', icon: 'none' })
					return
				}
				this.editingSubTaskId = id
				this.editTaskId = id
				this.editTaskContent = title
			},

			// 保存内联编辑
			async saveSubTaskEdit() {
				if (!this.editTaskContent.trim()) {
					uni.showToast({ title: '标题不能为空', icon: 'none' })
					return
				}
				try {
					await uniCloud.database().collection('opendb-task').doc(this.editTaskId).update({
						title: this.editTaskContent.trim()
					})
					// 更新本地数据
					const index = this.subTasks.findIndex(t => t._id === this.editTaskId)
					if (index !== -1) {
						this.subTasks[index].title = this.editTaskContent.trim()
					}
					uni.showToast({ title: '修改成功', icon: 'success' })
					this.cancelInlineEdit()
				} catch (e) {
					uni.showToast({ title: '修改失败', icon: 'none' })
				}
			},

			// 取消内联编辑
			cancelInlineEdit() {
				this.editingSubTaskId = ''
				this.editTaskId = ''
				this.editTaskContent = ''
			},

			// 处理编辑输入框失焦
			handleEditBlur() {
				// 延迟执行，避免与 confirm 事件冲突
				setTimeout(() => {
					// 如果还在编辑状态，说明不是按回车保存的，需要保存
					if (this.editingSubTaskId && this.editTaskContent.trim()) {
						this.saveSubTaskEdit()
					} else if (this.editingSubTaskId) {
						this.cancelInlineEdit()
					}
				}, 100)
			},

			openTaskEditPopup(id, content) {
				// 检查任务 ID 是否有效
				if (!id || id.startsWith('temp_')) {
					uni.showToast({ title: '任务正在保存中，请稍后', icon: 'none' })
					return
				}
				this.editTaskId = id
				this.editTaskContent = content
				this.$refs['popup-task-edit'].open()
			},

			editSubTask() {
				uniCloud.database().collection('opendb-task').doc(this.editTaskId).update({
					title: this.editTaskContent
				}).then(e => {
					this.loadSubTask();
					this.$refs['popup-task-edit'].close()
					this.editTaskContent = ''
					uni.showToast({ title: '修改成功', icon: 'success' })
				}).catch(e => {
					uni.showModal({
						title: '修改子任务失败',
						content: e.message,
						showCancel: false
					})
				})
			},

			cancelEditTask() {
				this.$refs['popup-task-edit'].close()
				this.resetTaskPopup()
			},

			resetTaskPopup() {
				this.editTaskId = ''
				this.editTaskContent = ''
			},

			setAssignee() {
				const memberInfo = this.getAssigneeInfo(this.currentTaskAssignee)
				const memberName = memberInfo ? memberInfo.text : '未知'
				// 获取子任务名称
				const subTask = this.subTasks.find(t => t._id === this.currentTaskId)
				const subTaskTitle = subTask ? subTask.title : '子任务'

				uniCloud.database().collection('opendb-task').doc(this.currentTaskId).update({
					'assignee': this.currentTaskAssignee
				}).then((e) => {
					this.$refs['popup-assignee-set'].close()
					this.loadSubTask()
					// 数据库触发器会自动记录日志，这里只需刷新动态列表
					this.loadTaskLogs()
					this.resetAssigneePopup()
					uni.showToast({ title: '设置成功', icon: 'success' })
				})
			},

			openAssignePopup(taskId, userId) {
				// 检查任务 ID 是否有效
				if (!taskId || taskId.startsWith('temp_')) {
					uni.showToast({ title: '任务正在保存中，请稍后', icon: 'none' })
					return
				}
				this.currentTaskId = taskId
				this.currentTaskAssignee = userId
				this.$refs['popup-assignee-set'].open()
			},

			cancelAssign() {
				this.$refs['popup-assignee-set'].close();
				this.resetAssigneePopup();
			},

			resetAssigneePopup() {
				this.currentTaskId = ''
				this.currentTaskAssignee = ''
			},

			async finish(task) {
				// 检查任务 ID 是否有效
				if (!task._id || task._id.startsWith('temp_')) {
					uni.showToast({
						title: '任务正在保存中，请稍后',
						icon: 'none'
					})
					return
				}

				const newStatus = task.status > 0 ? 0 : 2
				const taskTitle = task.title
				try {
					const taskObj = uniCloud.importObject('task-co')
					const res = await taskObj.changeState(task._id, newStatus)
					if (res.errCode && res.errCode !== 0) {
						throw new Error(res.errMsg || '操作失败')
					}
					// 刷新子任务列表
					this.loadSubTask()
					// 数据库触发器会自动记录日志，这里只需刷新动态列表
					this.loadTaskLogs()
				} catch (err) {
					console.error('更新子任务状态失败:', err)
					uni.showToast({
						title: '操作失败',
						icon: 'none'
					})
				}
			},

			setCurrentTaskId(taskId) {
				// 检查任务 ID 是否有效
				if (!taskId || taskId.startsWith('temp_')) {
					uni.showToast({ title: '任务正在保存中，请稍后', icon: 'none' })
					return
				}
				this.currentTaskId = taskId
			},

			setDeadLine(val) {
				if (val !== this.oldDeadline) {
					const newDeadline = new Date(val).getTime()
					uniCloud.database().collection('opendb-task').doc(this.taskId).update({
						'deadline': newDeadline
					}).then((e) => {
						uni.showToast({ title: '截止日期已更新', icon: 'success' })
						// 数据库触发器会自动记录日志，这里只需刷新动态列表
						this.loadTaskLogs()
						this.oldDeadline = val
					})
				}
			},

			bindDateChange: function(e) {
				this.currentTaskDeadLine = new Date(e.detail.value).getTime();
				uniCloud.database().collection('opendb-task').doc(this.currentTaskId).update({
					'deadline': this.currentTaskDeadLine
				}).then((e) => {
					this.loadSubTask();
				}).catch((e) => {
					uni.showModal({
						title: '设置截止日期失败',
						content: e.message,
						showCancel: false
					})
				})
			},

			openCommentPopup(id, content) {
				this.editCommentId = id
				this.editCommentContent = content
				this.$refs['popup-comment-edit'].open()
			},

			editComment() {
				uniCloud.database().collection('task-comments').doc(this.editCommentId).update({
					content: this.editCommentContent
				}).then(e => {
					uni.showToast({ title: '评论修改成功', icon: 'success' })
					this.loadComments()
					this.$refs['popup-comment-edit'].close()
					this.resetCommentPopup()
				})
			},

			cancelEditComment() {
				this.$refs['popup-comment-edit'].close()
				this.resetCommentPopup()
			},

			resetCommentPopup() {
				this.editCommentId = ''
				this.editCommentContent = ''
			},

			delComment(id) {
				uni.showModal({
					title: '删除确认',
					content: '确认删除此评论吗？',
					confirmColor: '#e74c3c',
					success: (res) => {
						if (res.confirm) {
							uniCloud.database().collection('task-comments').doc(id).remove().then(e => {
								uni.showToast({ title: '评论已删除', icon: 'success' })
								this.loadComments()
							})
						}
					}
				})
			},

			// 判断是否是评论作者
			isCommentAuthor(commentUserId) {
				return this.currentUserId && commentUserId === this.currentUserId
			},

			// 处理评论输入（监听@符号）
			handleCommentInput(e) {
				const value = e.detail.value
				this.comment = value

				// 查找最后一个@符号的位置
				const lastAtIndex = value.lastIndexOf('@')

				if (lastAtIndex !== -1) {
					// 获取@后面的文本作为搜索关键词
					const afterAt = value.substring(lastAtIndex + 1)

					// 如果@后面没有空格，说明可能在输入用户名
					if (!afterAt.includes(' ')) {
						this.mentionKeyword = afterAt
						this.mentionPosition = lastAtIndex
						this.showMentionList = true
					} else {
						this.showMentionList = false
					}
				} else {
					this.showMentionList = false
				}
			},

			// 选择@提及的成员
			selectMention(member) {
				// 在@位置插入用户名
				const before = this.comment.substring(0, this.mentionPosition)
				const after = this.comment.substring(this.mentionPosition + 1 + this.mentionKeyword.length)
				this.comment = `${before}@${member.text} ${after}`

				// 记录被@的用户
				if (!this.mentionedUsers.find(u => u.value === member.value)) {
					this.mentionedUsers.push(member)
				}

				// 关闭弹出层
				this.showMentionList = false
				this.mentionKeyword = ''
			},

			// 关闭@提及列表
			closeMentionList() {
				this.showMentionList = false
				this.mentionKeyword = ''
			},

			// 解析评论内容，返回带有@高亮的片段数组
			parseCommentContent(content) {
				if (!content) return [{ type: 'text', content: '' }]

				// 匹配@用户名（@后跟非空格字符直到空格或结尾）
				const mentionRegex = /@([^\s]+)/g
				const parts = []
				let lastIndex = 0
				let match

				while ((match = mentionRegex.exec(content)) !== null) {
					// 添加@之前的普通文本
					if (match.index > lastIndex) {
						parts.push({
							type: 'text',
							content: content.substring(lastIndex, match.index)
						})
					}

					// 添加@用户名（高亮）
					parts.push({
						type: 'mention',
						content: match[0] // 包含@符号的完整匹配
					})

					lastIndex = match.index + match[0].length
				}

				// 添加剩余的普通文本
				if (lastIndex < content.length) {
					parts.push({
						type: 'text',
						content: content.substring(lastIndex)
					})
				}

				return parts.length > 0 ? parts : [{ type: 'text', content }]
			},

			// 加载分组列表
			async loadGroups() {
				try {
					const db = uniCloud.database()
					const dbCmd = db.command
					const { result } = await db.collection('task-group')
						.where({
							project_id: this.projectId,
							archived: dbCmd.neq(true)
						})
						.orderBy('order asc')
						.get()
					this.groups = result.data
				} catch (e) {
					console.error('loadGroups error', e)
				}
			},

			// 打开分组选择弹窗
			openGroupPopup() {
				this.$refs['popup-group-select'].open()
			},

			// 关闭分组选择弹窗
			closeGroupPopup() {
				this.$refs['popup-group-select'].close()
			},

			// 选择分组
			async selectGroup(groupId) {
				try {
					await uniCloud.database().collection('opendb-task').doc(this.taskId).update({
						group_id: groupId
					})
					this.groupId = groupId
					this.$refs['popup-group-select'].close()
					uni.showToast({ title: '分组已更新', icon: 'success' })
					// 数据库触发器会自动记录日志，这里只需刷新动态列表
					this.loadTaskLogs()
				} catch (e) {
					uni.showToast({ title: '设置分组失败', icon: 'none' })
					console.error('selectGroup error', e)
				}
			},

			// 添加任务动态日志
			async addTaskLog(actionType, actionDetail, taskId = null) {
				try {
					const currentUser = uniCloud.getCurrentUserInfo()
					if (!currentUser || !currentUser.uid) {
						console.warn('未获取到当前用户信息，无法记录日志')
						return
					}

					await uniCloud.database().collection('opendb-task-logs').add({
						action_type: actionType,
						task_id: taskId || this.taskId,
						project_id: this.projectId,
						user_id: currentUser.uid,
						action_detail: actionDetail,
						create_time: Date.now()
					})

					// 刷新动态列表
					this.loadTaskLogs()
				} catch (e) {
					console.error('记录任务日志失败', e)
				}
			}
		}
	}
</script>

<style scoped>
/* ===== 页面容器 ===== */
.page-container {
	min-height: 100vh;
	background-color: #f7f8fa;
	position: relative;
}

/* ===== 下拉列表遮罩 ===== */
.dropdown-backdrop {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 999;
	background-color: transparent;
}

.content-wrapper {
	max-width: 900px;
	margin: 0 auto;
	padding: 16px;
}

/* ===== PC端页面标题栏 ===== */
.pc-page-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 0;
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
}

.pc-back-btn:hover {
	background-color: #d1f7e8;
}

.pc-title {
	font-size: 18px;
	font-weight: 600;
	color: #2c3e50;
}

.pc-header-right {
	display: flex;
	align-items: center;
	gap: 8px;
}

/* ===== 导航栏操作按钮 ===== */
.nav-actions {
	display: flex;
	gap: 8px;
}

.nav-action-btn {
	width: 36px;
	height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	background-color: #f0fdf7;
	cursor: pointer;
	transition: all 0.25s ease;
}

.nav-action-btn:hover {
	background-color: #d1f7e8;
	transform: scale(1.05);
}

.nav-action-btn--danger {
	background-color: #fef2f2;
}

.nav-action-btn--danger:hover {
	background-color: #fde8e8;
}

/* ===== 卡片样式 ===== */
.card {
	background-color: #ffffff;
	border-radius: 12px;
	margin-bottom: 16px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	overflow: visible;
	transition: all 0.25s ease;
}

.card:hover {
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
	display: flex;
	align-items: center;
	padding: 16px 20px;
	border-bottom: 1px solid #f0f0f0;
	gap: 8px;
}

.card-title {
	font-size: 15px;
	font-weight: 600;
	color: #2c3e50;
}

.card-badge {
	background-color: #e6fcf5;
	color: #42b983;
	font-size: 12px;
	padding: 2px 8px;
	border-radius: 10px;
	font-weight: 500;
}

.card-header-action {
	margin-left: auto;
	display: flex;
	align-items: center;
	gap: 4px;
	color: #42b983;
	font-size: 13px;
	cursor: pointer;
	padding: 4px 10px;
	border-radius: 6px;
	transition: all 0.2s ease;
}

.card-header-action:hover {
	background-color: #e6fcf5;
}

/* ===== 父任务链接 ===== */
.parent-task-link {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 12px 16px;
	margin-bottom: 16px;
	background-color: #fff;
	border-radius: 8px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	cursor: pointer;
	transition: all 0.2s ease;
}

.parent-task-link:hover {
	background-color: #f0fdf7;
	box-shadow: 0 2px 6px rgba(66, 185, 131, 0.15);
}

.parent-task-label {
	font-size: 12px;
	color: #fff;
	background-color: #42b983;
	padding: 2px 8px;
	border-radius: 4px;
	font-weight: 500;
}

.parent-task-title {
	flex: 1;
	font-size: 14px;
	color: #42b983;
	font-weight: 500;
}

.card-body {
	padding: 16px 20px;
	overflow: visible;
}

/* ===== 任务标题卡片 ===== */
.task-header-card {
	border-left: 4px solid #42b983;
	overflow: visible;
	padding: 16px 20px;
}

/* 修复 uni-datetime-picker 弹出层层级问题 */
:deep(.uni-datetime-picker) {
	position: relative;
	z-index: 100;
}

:deep(.uni-date-x) {
	z-index: 1000;
}

.task-title-row {
	margin-bottom: 20px;
}

.checkbox-wrapper {
	display: flex;
}

.task-title-label {
	display: flex;
	align-items: center;
	gap: 12px;
	cursor: pointer;
}

.task-checkbox {
	transform: scale(1.2);
}

.task-title {
	font-size: 20px;
	font-weight: 600;
	color: #2c3e50;
	line-height: 1.4;
}

.task-completed {
	color: #9ca3af;
	text-decoration: line-through;
}

/* ===== 任务元信息 ===== */
.task-meta-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 16px 32px;
}

.meta-item {
	display: flex;
	align-items: center;
	gap: 12px;
}

.meta-label {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 13px;
	color: #6c757d;
	white-space: nowrap;
}

.meta-value {
	/* 移除 padding-left，改为 flex 布局 */
}

/* ===== 负责人选择器 ===== */
.assignee-selector-wrapper {
	position: relative;
}

.assignee-selector {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 12px;
	background-color: #f7f8fa;
	border-radius: 20px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.assignee-selector:hover {
	background-color: #e6fcf5;
}

/* ===== 负责人下拉选择 ===== */
.assignee-dropdown {
	position: absolute;
	top: 100%;
	left: 0;
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
	background-color: #f0fdf7;
}

.assignee-option--selected {
	background-color: #e6fcf5;
}

.assignee-option--selected:hover {
	background-color: #d1f7e8;
}

.assignee-option-avatar {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.assignee-option-avatar image {
	width: 100%;
	height: 100%;
}

.assignee-option-avatar--empty {
	background-color: #f3f4f6;
}

.assignee-option-avatar--text {
	background: linear-gradient(135deg, #42b983 0%, #359568 100%);
	color: #fff;
	font-size: 14px;
	font-weight: 600;
}

.assignee-option-name {
	flex: 1;
	font-size: 14px;
	color: #333;
}

.assignee-avatar {
	width: 28px;
	height: 28px;
	border-radius: 50%;
	overflow: hidden;
	background: linear-gradient(135deg, #42b983 0%, #359568 100%);
	display: flex;
	align-items: center;
	justify-content: center;
}

.assignee-avatar image {
	width: 100%;
	height: 100%;
}

.assignee-avatar .avatar-text {
	color: #fff;
	font-size: 12px;
	font-weight: 600;
}

.assignee-placeholder {
	width: 28px;
	height: 28px;
	border-radius: 50%;
	border: 1px dashed #d1d5db;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: #f9fafb;
}

.assignee-name {
	font-size: 14px;
	color: #2c3e50;
}

/* ===== 成员选择弹窗 ===== */
.assignee-popup-container {
	width: 320px;
	max-height: 400px;
}

.member-grid {
	display: flex;
	flex-direction: column;
	gap: 8px;
	max-height: 280px;
	overflow-y: auto;
}

.member-option {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 10px 12px;
	border-radius: 8px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.member-option:hover {
	background-color: #f0fdf7;
}

.member-option--selected {
	background-color: #e6fcf5;
}

.member-option-avatar {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	overflow: hidden;
	background: linear-gradient(135deg, #42b983 0%, #359568 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.member-option-avatar image {
	width: 100%;
	height: 100%;
}

.member-option-avatar .avatar-text {
	color: #fff;
	font-size: 14px;
	font-weight: 600;
}

.member-option-name {
	flex: 1;
	font-size: 14px;
	color: #2c3e50;
}

/* ===== 分组选择器 ===== */
.group-selector {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 12px;
	background-color: #f7f8fa;
	border-radius: 6px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.group-selector:hover {
	background-color: #e6fcf5;
}

.group-name {
	font-size: 14px;
	color: #2c3e50;
}

.group-option-icon {
	width: 32px;
	height: 32px;
	border-radius: 6px;
	background-color: #e6fcf5;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

/* 移动端换行显示 */
@media (max-width: 600px) {
	.task-meta-grid {
		flex-direction: column;
		gap: 12px;
	}
}

.meta-select {
	width: 100%;
}

.deadline-picker {
	display: inline-flex;
	padding: 6px 12px;
	background-color: #f7f8fa;
	border-radius: 6px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.deadline-picker:hover {
	background-color: #e6fcf5;
}

.deadline-text {
	font-size: 14px;
	color: #2c3e50;
}

.deadline-overdue {
	background-color: #fef2f2;
}

.deadline-overdue .deadline-text {
	color: #e74c3c;
}

/* ===== 优先级标签 ===== */
.priority-badge {
	display: inline-flex;
	padding: 4px 12px;
	border-radius: 12px;
	font-size: 12px;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.2s ease;
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

/* ===== 任务描述 ===== */
.task-description {
	font-size: 14px;
	color: #4a5568;
	line-height: 1.7;
	white-space: pre-wrap;
}

/* ===== 附件网格 ===== */
.attachment-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
	gap: 12px;
	margin-bottom: 16px;
}

@media (min-width: 600px) {
	.attachment-grid {
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
	}
}

.attachment-grid-item {
	aspect-ratio: 1;
}

.image-attachment-item {
	position: relative;
	border-radius: 8px;
	overflow: hidden;
	cursor: pointer;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	transition: all 0.25s ease;
}

.image-attachment-item:hover {
	transform: scale(1.02);
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.image-thumbnail {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.image-overlay {
	position: absolute;
	inset: 0;
	background: rgba(0, 0, 0, 0);
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.25s ease;
	opacity: 0;
}

.image-attachment-item:hover .image-overlay {
	background: rgba(0, 0, 0, 0.4);
	opacity: 1;
}

.image-delete {
	position: absolute;
	top: 6px;
	right: 6px;
	width: 24px;
	height: 24px;
	background: rgba(0, 0, 0, 0.5);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	opacity: 0;
	transition: all 0.2s ease;
}

.image-attachment-item:hover .image-delete {
	opacity: 1;
}

.image-delete:hover {
	background: #e74c3c;
}

/* 非图片附件样式 */
.file-attachment-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 12px 8px;
	background-color: #f7f8fa;
	border-radius: 8px;
	transition: all 0.25s ease;
	cursor: pointer;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.file-attachment-item:hover {
	background-color: #e6fcf5;
	transform: translateY(-2px);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.file-icon-wrapper {
	width: 56px;
	height: 56px;
	border-radius: 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 10px;
	background-color: #e9ecef;
}

.file-type-icon {
	width: 32px;
	height: 32px;
}

/* 不同文件类型的图标背景色 */
.file-icon--pdf {
	background-color: #fde8e8;
}

.file-icon--word {
	background-color: #dbeafe;
}

.file-icon--excel {
	background-color: #d1fae5;
}

.file-icon--ppt {
	background-color: #fed7aa;
}

.file-icon--zip {
	background-color: #fef3c7;
}

.file-icon--video {
	background-color: #ede9fe;
}

.file-icon--audio {
	background-color: #fce7f3;
}

.file-icon--text {
	background-color: #f3f4f6;
}

.file-icon--file {
	background-color: #e5e7eb;
}

.file-name {
	font-size: 12px;
	color: #4a5568;
	text-align: center;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: 1.4;
	max-width: 100%;
	width: 100%;
	padding: 0 4px;
	box-sizing: border-box;
}

.file-actions {
	display: flex;
	gap: 8px;
	margin-top: 8px;
	opacity: 0;
	transition: opacity 0.2s ease;
}

.file-attachment-item:hover .file-actions {
	opacity: 1;
}

.file-action {
	font-size: 12px;
	color: #42b983;
	cursor: pointer;
}

.file-action:hover {
	text-decoration: underline;
}

.file-action--danger {
	color: #e74c3c;
}

.attachment-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 14px;
	background-color: #f7f8fa;
	border-radius: 8px;
	transition: all 0.2s ease;
}

.attachment-item:hover {
	background-color: #e6fcf5;
}

.attachment-info {
	display: flex;
	align-items: center;
	gap: 8px;
}

.attachment-name {
	font-size: 14px;
	color: #2c3e50;
}

.attachment-actions {
	display: flex;
	gap: 12px;
}

.attachment-action {
	font-size: 13px;
	color: #42b983;
	cursor: pointer;
	transition: all 0.2s ease;
}

.attachment-action:hover {
	text-decoration: underline;
}

.attachment-action--danger {
	color: #e74c3c;
}

.upload-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	padding: 10px 20px;
	background-color: #e6fcf5;
	color: #42b983;
	border: 1px dashed #42b983;
	border-radius: 8px;
	font-size: 14px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.upload-btn:hover {
	background-color: #d1f7e8;
}

/* ===== 空状态占位 ===== */
.empty-placeholder {
	text-align: center;
	padding: 24px;
	color: #9ca3af;
	font-size: 14px;
}

/* ===== 子任务列表 ===== */
.subtask-list {
	display: flex;
	flex-direction: column;
	overflow: visible;
}

.subtask-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 0;
	border-bottom: 1px solid #f0f0f0;
	transition: all 0.2s ease;
	cursor: pointer;
	overflow: visible;
}

.subtask-item:last-child {
	border-bottom: none;
}

.subtask-item:hover {
	background-color: #fafafa;
	margin: 0 -20px;
	padding: 12px 20px;
}

.subtask-main {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	flex: 1;
}

.subtask-checkbox {
	margin-top: 2px;
}

.subtask-content {
	flex: 1;
}

.subtask-title {
	font-size: 14px;
	color: #2c3e50;
	line-height: 1.5;
}

.subtask-completion {
	font-size: 12px;
	color: #9ca3af;
	margin-top: 4px;
}

.subtask-meta {
	display: flex;
	align-items: center;
	gap: 12px;
	overflow: visible;
}

.subtask-deadline {
	font-size: 12px;
	color: #6c757d;
	padding: 4px 8px;
	background-color: #f7f8fa;
	border-radius: 4px;
	cursor: pointer;
}

.subtask-deadline:hover {
	background-color: #e6fcf5;
	color: #42b983;
}

.subtask-assignee-wrapper {
	position: relative;
}

.subtask-assignee {
	font-size: 12px;
	color: #42b983;
	padding: 4px 8px;
	background-color: #e6fcf5;
	border-radius: 4px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.subtask-assignee:hover {
	background-color: #d1f7e8;
}

.subtask-assignee-dropdown {
	position: absolute;
	top: 100%;
	right: 0;
	margin-top: 4px;
	width: 200px;
	background-color: #fff;
	border-radius: 8px;
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
	z-index: 1000;
	overflow: hidden;
}

.subtask-assignee-dropdown-list {
	max-height: 200px;
	padding: 4px 0;
}

.subtask-assignee-dropdown .assignee-option {
	padding: 8px 12px;
	gap: 8px;
}

.subtask-assignee-dropdown .assignee-option-avatar {
	width: 24px;
	height: 24px;
}

.subtask-assignee-dropdown .assignee-option-name {
	font-size: 13px;
}

.subtask-actions {
	display: flex;
	gap: 8px;
	opacity: 0;
	transition: opacity 0.2s ease;
}

.subtask-item:hover .subtask-actions {
	opacity: 1;
}

.add-subtask-form,
.subtask-edit-form {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 0;
}

.subtask-edit-form {
	background-color: #f0fdf7;
	margin: 0 -16px;
	padding: 12px 16px;
}

.add-subtask-input {
	flex: 1;
	padding: 8px 12px;
	border: none;
	border-radius: 6px;
	font-size: 14px;
	outline: none;
	background: transparent;
}

.checkbox-placeholder {
	width: 18px;
	height: 18px;
	border: 2px solid #42b983;
	border-radius: 4px;
	flex-shrink: 0;
	background-color: #fff;
}

/* ===== 评论列表 ===== */
.comment-list {
	display: flex;
	flex-direction: column;
	gap: 16px;
	margin-bottom: 20px;
}

.comment-item {
	display: flex;
	gap: 12px;
}

.comment-avatar {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background: linear-gradient(135deg, #42b983 0%, #359568 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	color: #ffffff;
	font-size: 14px;
	font-weight: 600;
	flex-shrink: 0;
}

.comment-content {
	flex: 1;
	background-color: #f7f8fa;
	border-radius: 8px;
	padding: 12px 16px;
}

.comment-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 6px;
}

.comment-author {
	font-size: 13px;
	font-weight: 600;
	color: #2c3e50;
}

.comment-actions {
	display: flex;
	gap: 8px;
	opacity: 0;
	transition: opacity 0.2s ease;
}

.comment-item:hover .comment-actions {
	opacity: 1;
}

.comment-text {
	font-size: 14px;
	color: #4a5568;
	line-height: 1.6;
}

.comment-mention {
	color: #42b983;
	font-weight: 600;
	background-color: rgba(66, 185, 131, 0.1);
	padding: 2px 4px;
	border-radius: 3px;
}

/* ===== 评论表单 ===== */
.comment-form {
	border-top: 1px solid #f0f0f0;
	padding-top: 16px;
}

.comment-textarea {
	width: 100%;
	min-height: 80px;
	padding: 12px;
	border: 1px solid #e0e0e0;
	border-radius: 8px;
	font-size: 14px;
	resize: vertical;
	outline: none;
	transition: all 0.2s ease;
	box-sizing: border-box;
}

.comment-textarea:focus {
	border-color: #42b983;
	box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1);
}

.comment-submit-btn {
	margin-top: 12px;
	padding: 10px 24px;
	background: linear-gradient(135deg, #42b983 0%, #359568 100%);
	color: #ffffff;
	border: none;
	border-radius: 8px;
	font-size: 14px;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.2s ease;
}

.comment-submit-btn:hover {
	transform: translateY(-1px);
	box-shadow: 0 4px 12px rgba(66, 185, 131, 0.3);
}

/* ===== @成员选择弹出层样式 ===== */
.mention-list {
	position: absolute;
	bottom: 100%;
	left: 0;
	right: 0;
	margin-bottom: 8px;
	background-color: #ffffff;
	border: 1px solid #e9ecef;
	border-radius: 8px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	max-height: 300px;
	overflow: hidden;
	z-index: 100;
}

.mention-list-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	border-bottom: 1px solid #e9ecef;
	background-color: #f8f9fa;
}

.mention-list-title {
	font-size: 14px;
	font-weight: 600;
	color: #2c3e50;
}

.mention-empty {
	padding: 32px;
	text-align: center;
	color: #6c757d;
	font-size: 14px;
}

.mention-scroll {
	max-height: 240px;
}

.mention-item {
	display: flex;
	align-items: center;
	padding: 12px 16px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.mention-item:hover {
	background-color: #f0fdf7;
}

.mention-avatar {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	background: linear-gradient(135deg, #42b983, #35495e);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 12px;
	flex-shrink: 0;
}

.mention-avatar text {
	color: #ffffff;
	font-size: 14px;
	font-weight: 600;
}

.mention-name {
	font-size: 14px;
	color: #2c3e50;
	flex: 1;
}

.comment-form {
	position: relative;
}

/* ===== 弹窗样式 ===== */
.popup-container {
	width: 320px;
	border-radius: 12px;
	overflow: hidden;
}

.popup-header {
	padding: 20px;
	text-align: center;
	border-bottom: 1px solid #f0f0f0;
}

.popup-title {
	font-size: 16px;
	font-weight: 600;
	color: #2c3e50;
}

.popup-body {
	padding: 20px;
}

.popup-body--center {
	display: flex;
	justify-content: center;
	min-height: 100px;
	align-items: flex-start;
}

.popup-textarea {
	width: 100%;
	min-height: 100px;
	padding: 12px;
	border: 1px solid #e0e0e0;
	border-radius: 8px;
	font-size: 14px;
	resize: vertical;
	outline: none;
	box-sizing: border-box;
}

.popup-textarea:focus {
	border-color: #42b983;
	box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1);
}

.popup-select {
	width: 200px;
}

.popup-footer {
	display: flex;
	justify-content: center;
	gap: 12px;
	padding: 16px 20px;
	border-top: 1px solid #f0f0f0;
}

.popup-btn {
	padding: 10px 24px;
	border-radius: 8px;
	font-size: 14px;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.2s ease;
}

.popup-btn--primary {
	background: linear-gradient(135deg, #42b983 0%, #359568 100%);
	color: #ffffff;
	border: none;
}

.popup-btn--primary:hover {
	transform: translateY(-1px);
	box-shadow: 0 4px 12px rgba(66, 185, 131, 0.3);
}

.popup-btn--default {
	background-color: #f7f8fa;
	color: #6c757d;
	border: 1px solid #e0e0e0;
}

.popup-btn--default:hover {
	background-color: #e9ecef;
}

/* ===== 任务动态列表 ===== */
.activity-list {
	display: flex;
	flex-direction: column;
}

.activity-item {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	padding: 12px 0;
	border-bottom: 1px solid #f0f0f0;
	position: relative;
}

.activity-item:last-child {
	border-bottom: none;
}

/* 时间线连接线 */
.activity-item:not(:last-child)::before {
	content: '';
	position: absolute;
	left: 14px;
	top: 36px;
	bottom: -12px;
	width: 2px;
	background-color: #e9ecef;
}

.activity-icon {
	width: 30px;
	height: 30px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	z-index: 1;
}

.activity-icon--create {
	background: linear-gradient(135deg, #42b983 0%, #359568 100%);
}

.activity-icon--update {
	background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
}

.activity-icon--delete {
	background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
}

.activity-icon--complete {
	background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
}

.activity-content {
	flex: 1;
	min-width: 0;
}

.activity-text {
	font-size: 14px;
	color: #4a5568;
	line-height: 1.5;
	margin-bottom: 4px;
}

.activity-user {
	font-weight: 600;
	color: #42b983;
	margin-right: 4px;
}

.activity-action {
	color: #4a5568;
}

.activity-time {
	font-size: 12px;
	color: #9ca3af;
}

/* ===== 加载和错误状态 ===== */
.loading-wrapper {
	padding: 40px 0;
}

.error-card {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12px;
	padding: 24px;
	background-color: #fef2f2;
	border-radius: 12px;
	margin-bottom: 16px;
}

.error-text {
	color: #e74c3c;
	font-size: 14px;
}

/* ===== 优先级选择器 ===== */
.priority-selector-wrapper {
	position: relative;
}

.priority-selector {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 4px 8px;
	cursor: pointer;
	border-radius: 8px;
	transition: all 0.2s ease;
}

.priority-selector:hover {
	background-color: #f7f8fa;
}

.priority-dropdown {
	position: absolute;
	top: 100%;
	left: 0;
	margin-top: 8px;
	width: 160px;
	background-color: #fff;
	border-radius: 12px;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
	z-index: 1000;
	overflow: hidden;
	padding: 8px 0;
}

.priority-option {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 16px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.priority-option:hover {
	background-color: #f0fdf7;
}

.priority-option--selected {
	background-color: #e6fcf5;
}

.priority-option--selected:hover {
	background-color: #d1f7e8;
}

/* ===== 分组选择器 ===== */
.group-selector-wrapper {
	position: relative;
}

.group-selector {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 12px;
	background-color: #f7f8fa;
	border-radius: 8px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.group-selector:hover {
	background-color: #e6fcf5;
}

.group-name {
	font-size: 14px;
	color: #2c3e50;
}

.group-dropdown {
	position: absolute;
	top: 100%;
	left: 0;
	margin-top: 8px;
	min-width: 200px;
	max-width: 280px;
	background-color: #fff;
	border-radius: 12px;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
	z-index: 1000;
	overflow: hidden;
	padding: 8px 0;
	max-height: 300px;
	overflow-y: auto;
}

.group-option {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 10px 16px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.group-option:hover {
	background-color: #f0fdf7;
}

.group-option--selected {
	background-color: #e6fcf5;
}

.group-option--selected:hover {
	background-color: #d1f7e8;
}

.group-option-icon {
	width: 24px;
	height: 24px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.group-option-name {
	flex: 1;
	font-size: 14px;
	color: #333;
}

/* ===== 响应式优化 ===== */
@media (max-width: 600px) {
	.content-wrapper {
		padding: 12px;
	}

	.subtask-item {
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
	}

	.subtask-meta {
		margin-left: 32px;
	}

	.subtask-actions {
		opacity: 1;
	}

	.comment-actions {
		opacity: 1;
	}
}
</style>
