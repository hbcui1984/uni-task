<!--
 * 新建任务页面
 *
 * 功能说明：
 * - 创建新任务，填写标题、描述、负责人、截止日期、优先级等
 * - 支持选择任务分组
 * - 支持添加附件
 * - 创建成功后返回任务列表
 *
 * 路由：/pages/opendb-task/add?pid={projectId}
-->
<template>
	<view class="page">
		<view class="container">
			<!-- 任务信息卡片（合并基本信息和任务设置） -->
			<view class="card">
				<view class="card-header">
					<uni-icons type="compose" size="18" color="#42b983"></uni-icons>
					<text class="card-title">任务信息</text>
				</view>
				<view class="card-body">
					<uni-forms ref="form" :value="formData" validate-trigger="submit" err-show-type="toast" :label-width="90">
						<!-- 任务标题 -->
						<uni-forms-item name="title" label="任务标题" required>
							<uni-easyinput placeholder="输入任务标题" v-model="formData.title" trim="both" />
						</uni-forms-item>

						<!-- 任务描述 -->
						<uni-forms-item name="content" label="任务描述">
							<textarea
								placeholder="输入任务详细描述（选填）"
								@input="binddata('content', $event.detail.value)"
								class="textarea-input"
								:value="formData.content"
								trim="right"
							></textarea>
						</uni-forms-item>

						<!-- 宽屏下两列布局的设置项 -->
						<view class="settings-grid">
							<!-- 任务分组 -->
							<uni-forms-item name="group_id" label="任务分组" class="grid-item">
								<uni-data-picker
									v-model="formData.group_id"
									:localdata="groupOptions"
									placeholder="选择分组（选填）"
								></uni-data-picker>
							</uni-forms-item>

							<!-- 负责人 -->
							<view class="grid-item setting-item-inline">
								<view class="setting-label-inline">
									<uni-icons type="person" size="16" color="#6c757d"></uni-icons>
									<text>负责人</text>
								</view>
								<uni-data-picker
									v-model="formData.assignee"
									:localdata="memberOptions"
									placeholder="选择负责人（选填）"
									class="setting-picker-inline"
								></uni-data-picker>
							</view>

							<!-- 截止日期 -->
							<view class="grid-item setting-item-inline">
								<view class="setting-label-inline">
									<uni-icons type="calendar" size="16" color="#6c757d"></uni-icons>
									<text>截止日期</text>
								</view>
								<picker mode="date" :value="date" :start="startDate" :end="endDate" @change="bindDateChange" class="setting-picker-inline">
									<view class="setting-value-inline">{{date ? date : '选择日期（选填）'}}</view>
								</picker>
							</view>

							<!-- 优先级 -->
							<view class="grid-item setting-item-inline">
								<view class="setting-label-inline">
									<uni-icons type="flag" size="16" color="#6c757d"></uni-icons>
									<text>优先级</text>
								</view>
								<uni-data-picker
									v-model="formData.priority"
									:localdata="priorityOptions"
									placeholder="选择优先级"
									class="setting-picker-inline"
								></uni-data-picker>
							</view>
						</view>

						<!-- 隐藏的项目ID -->
						<uni-forms-item name="project_id" style="display: none;">
							<uni-easyinput v-model="formData.project_id"></uni-easyinput>
						</uni-forms-item>
					</uni-forms>
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
					<view v-if="attachments && attachments.length > 0" class="attachment-list">
						<!-- 图片附件网格显示 -->
						<view v-if="imageAttachments.length > 0" class="image-attachment-grid">
							<view
								v-for="(item, index) in imageAttachments"
								:key="'img-' + index"
								class="image-attachment-item"
								@click="previewImage(item.url, index)"
							>
								<image :src="item.url" mode="aspectFill" class="image-thumbnail"></image>
								<view class="image-overlay">
									<uni-icons type="eye" size="20" color="#fff"></uni-icons>
								</view>
								<view class="image-delete" @click.stop="delFile(index)">
									<uni-icons type="closeempty" size="14" color="#fff"></uni-icons>
								</view>
							</view>
						</view>

						<!-- 非图片附件列表显示 -->
						<view v-for="(item, index) in nonImageAttachments" :key="'file-' + index" class="attachment-item">
							<view class="attachment-info">
								<uni-icons type="paperclip" size="16" color="#6c757d"></uni-icons>
								<text class="attachment-name">{{item.name}}</text>
							</view>
							<view class="attachment-actions">
								<text class="attachment-action attachment-action--danger" @click="delFile(attachments.indexOf(item))">删除</text>
							</view>
						</view>
					</view>
					<view v-else class="empty-placeholder">
						<text>暂无附件</text>
					</view>

					<uni-file-picker
						v-model="files"
						limit="9"
						file-mediatype="all"
						return-type="object"
						@success="uploadSuccess"
						@select="fileSelect"
						@delete="fileDel"
						class="file-picker"
					>
						<button class="upload-btn">
							<uni-icons type="plusempty" size="14" color="#42b983"></uni-icons>
							<text>上传附件</text>
						</button>
					</uni-file-picker>
				</view>
			</view>

			<!-- 提交按钮 -->
			<view class="button-group">
				<button class="cancel-btn" @click="cancel">取消</button>
				<button type="primary" class="submit-btn" @click="submit">创建任务</button>
			</view>
		</view>
	</view>
</template>

<script>
import {
	validator
} from '../../js_sdk/validator/opendb-task.js';

const db = uniCloud.database();
const dbCollectionName = 'opendb-task';

function getValidator(fields) {
	let reuslt = {}
	for (let key in validator) {
		if (fields.indexOf(key) > -1) {
			reuslt[key] = validator[key]
		}
	}
	return reuslt
}

function getDate(type) {
	const date = new Date();

	let year = date.getFullYear();
	let month = date.getMonth() + 1;
	let day = date.getDate();

	if (type === 'start') {
		year = year - 3;
	} else if (type === 'end') {
		year = year + 10;
	}
	month = month > 9 ? month : '0' + month;
	day = day > 9 ? day : '0' + day;

	return `${year}-${month}-${day}`;
}

export default {
	data() {
		return {
			formData: {
				"project_id": '',
				"group_id": '',
				"title": "",
				"content": "",
				"assignee": "",
				"priority": 1,
				"deadline": "",
				"attachments": []
			},
			priorityArray: ['较低', '普通', '较高', '最高'],
			priorityOptions: [
				{ value: 0, text: '较低' },
				{ value: 1, text: '普通' },
				{ value: 2, text: '较高' },
				{ value: 3, text: '最高' }
			],
			date: '',
			startDate: getDate('start'),
			endDate: getDate('end'),
			formOptions: {},
			rules: {
				...getValidator(["project_id", "title"])
			},
			groupOptions: [],
			memberOptions: [],
			loading: false,
			attachments: [],
			files: []
		}
	},
	computed: {
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
		}
	},
	onReady() {
		this.$refs.form.setRules(this.rules)
	},
	async onLoad(event) {
		console.log("event", event);
		this.formData.project_id = event.project_id
		this.formData.group_id = event.group_id

		// 预加载分组和成员数据
		await this.loadGroupsAndMembers(event.project_id)
	},
	methods: {
		binddata(name, value) {
			this.formData[name] = value
		},

		/**
		 * 预加载分组和成员数据
		 */
		async loadGroupsAndMembers(projectId) {
			if (!projectId) return

			this.loading = true

			try {
				// 并行加载分组和成员数据
				const [groupsResult, membersResult] = await Promise.all([
					// 加载任务分组
					db.collection('task-group')
						.where(`project_id == '${projectId}'`)
						.field('_id, name')
						.orderBy('order', 'asc')
						.get(),
					// 加载项目成员
					db.collection('opendb-projects')
						.doc(projectId)
						.get()
				])

				// 处理分组数据
				this.groupOptions = groupsResult.result.data.map(item => ({
					value: item._id,
					text: item.name
				}))

				// 处理成员数据
				if (membersResult.result.data.length > 0) {
					const project = membersResult.result.data[0]
					const memberIds = [...new Set([...(project.members || []), ...(project.managers || [])])]

					if (memberIds.length > 0) {
						// 获取成员详细信息
						const dbCmd = db.command
						const usersResult = await db.collection('uni-id-users')
							.where({
								_id: dbCmd.in(memberIds)
							})
							.field('_id, nickname')
							.get()

						this.memberOptions = usersResult.result.data.map(user => ({
							value: user._id,
							text: user.nickname || '未命名用户'
						}))
					}
				}

				console.log('预加载完成:', {
					groups: this.groupOptions.length,
					members: this.memberOptions.length
				})
			} catch (error) {
				console.error('预加载失败:', error)
				uni.showToast({
					title: '数据加载失败',
					icon: 'none'
				})
			} finally {
				this.loading = false
			}
		},

		/**
		 * 图片预览
		 */
		previewImage(url, index) {
			const imageUrls = this.imageAttachments.map(item => item.url)
			uni.previewImage({
				current: index,
				urls: imageUrls
			})
		},

		/**
		 * 删除附件
		 */
		delFile(index) {
			uni.showModal({
				title: '删除确认',
				content: '确认删除此附件吗？',
				confirmColor: '#e74c3c',
				success: (res) => {
					if (res.confirm) {
						this.attachments.splice(index, 1)
						uni.showToast({
							title: '已删除',
							icon: 'success'
						})
					}
				}
			})
		},

		/**
		 * 文件上传成功
		 */
		uploadSuccess(e) {
			console.log('upload success', e)
			e.tempFiles.forEach(file => {
				const {extname, name, path, size, fileID} = file;
				this.attachments.push({
					extname,
					name,
					path,
					size,
					fileID,
					url: file.url
				})
			})
			this.files = []
		},

		/**
		 * 文件选择
		 */
		fileSelect(e) {
			console.log('file select', e)
		},

		/**
		 * 文件删除
		 */
		fileDel(e) {
			console.log("file delete", e);
		},

		/**
		 * 触发表单提交
		 */
		submit() {
			console.log("开始提交");
			uni.showLoading({
				mask: true
			})
			this.$refs.form.submit().then((res) => {
				this.submitForm(res)
			}).catch((errors) => {
				uni.hideLoading()
			})
		},

		submitForm(value) {
			console.log("submit", value);

			// 添加附件和截止日期到提交数据
			if (this.attachments.length > 0) {
				value.attachments = this.attachments
			}
			if (this.date) {
				value.deadline = new Date(this.date).getTime()
			}

			// 使用 clientDB 提交数据
			db.collection(dbCollectionName).add(value).then((res) => {
				uni.showToast({
					icon: 'success',
					title: '新增成功'
				})
				// 尝试通知上一页刷新数据
				try {
					this.getOpenerEventChannel().emit('refreshData')
				} catch (e) {
					console.log('无法获取 opener event channel')
				}
				// 返回上一页
				setTimeout(() => {
					uni.navigateBack({
						fail: () => {
							// 如果返回失败，跳转到任务列表
							uni.redirectTo({
								url: `/pages/opendb-task/list?id=${this.formData.project_id}`
							})
						}
					})
				}, 500)
			}).catch((err) => {
				uni.showModal({
					content: err.message || '请求服务失败',
					showCancel: false
				})
			}).finally(() => {
				uni.hideLoading()
			})
		},

		bindDateChange: function(e) {
			this.date = e.detail.value
		},

		/**
		 * 优先级发生变化
		 */
		bindPriorityChange: function(e) {
			console.log(e.detail.value);
			this.formData.priority = parseInt(e.detail.value)
		},

		/**
		 * 取消
		 */
		cancel() {
			uni.navigateBack()
		}
	}
}
</script>

<style scoped>
page {
	background: linear-gradient(to bottom, #fafdfb, #f7f8fa);
	min-height: 100vh;
}

.page {
	min-height: 100vh;
	padding: 16px 0 40px;
}

/* ===== 容器 ===== */
.container {
	max-width: 800px;
	margin: 0 auto;
	padding: 0 16px;
}

@media screen and (min-width: 768px) {
	.container {
		padding: 0 24px;
	}
}

@media screen and (min-width: 1200px) {
	.container {
		max-width: 900px;
	}
}

/* ===== 卡片样式 ===== */
.card {
	background-color: #ffffff;
	border-radius: 12px;
	margin-bottom: 16px;
	box-shadow: 0 2px 8px rgba(66, 185, 131, 0.08);
	overflow: hidden;
	transition: all 0.25s ease;
}

/* 第一个卡片（基本信息卡片）需要允许内容溢出，以显示下拉菜单 */
.card:first-child {
	overflow: visible;
}

.card:hover {
	box-shadow: 0 4px 14px rgba(66, 185, 131, 0.12);
}

.card-header {
	display: flex;
	align-items: center;
	padding: 16px 20px;
	background: linear-gradient(135deg, #f0fdf7 0%, #e6fcf5 100%);
	border-bottom: 1px solid #e9ecef;
	gap: 8px;
}

.card-title {
	font-size: 16px;
	font-weight: 600;
	color: #2c3e50;
}

.card-badge {
	background-color: #42b983;
	color: #ffffff;
	font-size: 12px;
	padding: 2px 8px;
	border-radius: 10px;
	font-weight: 500;
	margin-left: auto;
}

.card-body {
	padding: 20px;
}

/* ===== 表单样式 ===== */
:deep(.uni-forms-item) {
	margin-bottom: 20px;
}

:deep(.uni-forms-item__label) {
	color: #2c3e50;
	font-weight: 500;
	font-size: 14px;
	min-width: 90px !important;
}

:deep(.uni-easyinput__content) {
	border: 1px solid #e9ecef;
	border-radius: 8px;
	transition: all 0.25s ease;
	background-color: #ffffff;
}

:deep(.uni-easyinput__content:hover) {
	border-color: #42b983;
	background-color: #f0fdf7;
}

:deep(.is-focused .uni-easyinput__content),
:deep(.uni-easyinput__content.is-focused),
:deep(.uni-easyinput.is-focused .uni-easyinput__content) {
	border-color: #42b983 !important;
	box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1) !important;
}

/* 输入框获得焦点时的边框颜色 */
:deep(.uni-easyinput__content:focus-within) {
	border-color: #42b983 !important;
	box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1) !important;
}

:deep(.uni-easyinput__content-input) {
	font-size: 14px;
	color: #2c3e50;
}

.textarea-input {
	width: 100%;
	padding: 12px;
	min-height: 120px;
	border: 1px solid #e9ecef;
	border-radius: 8px;
	font-size: 14px;
	line-height: 1.6;
	transition: all 0.25s ease;
	background-color: #ffffff;
	color: #2c3e50;
	box-sizing: border-box;
}

.textarea-input:focus {
	outline: none;
	border-color: #42b983;
	box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1);
	background-color: #fafdfb;
}

/* ===== 设置项网格布局 ===== */
.settings-grid {
	display: grid;
	grid-template-columns: 1fr;
	gap: 16px;
	margin-top: 8px;
	padding-top: 20px;
	border-top: 1px solid #f0f0f0;
}

@media screen and (min-width: 768px) {
	.settings-grid {
		grid-template-columns: repeat(2, 1fr);
		gap: 20px 24px;
	}
}

.grid-item {
	min-width: 0;
}

/* 内联设置项样式 */
.setting-item-inline {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.setting-label-inline {
	display: flex;
	align-items: center;
	gap: 6px;
	color: #2c3e50;
	font-size: 14px;
	font-weight: 500;
}

.setting-picker-inline {
	flex: 1;
	width: 100%;
}

.setting-value-inline {
	padding: 10px 12px;
	background-color: #f8f9fa;
	border: 1px solid #e9ecef;
	border-radius: 8px;
	color: #6c757d;
	font-size: 14px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.setting-value-inline:hover {
	border-color: #42b983;
	background-color: #f0fdf7;
}

:deep(.setting-picker-inline) {
	width: 100%;
}

:deep(.setting-picker-inline .uni-data-picker) {
	border: 1px solid #e9ecef;
	border-radius: 8px;
	background-color: #ffffff;
}

:deep(.setting-picker-inline .uni-data-picker:hover) {
	border-color: #42b983;
	background-color: #f0fdf7;
}

/* uni-forms-item 在 grid 中的样式调整 */
.settings-grid :deep(.uni-forms-item) {
	margin-bottom: 0;
}

.settings-grid :deep(.uni-forms-item__label) {
	min-width: auto !important;
	padding-bottom: 8px;
}

@media screen and (min-width: 768px) {
	.settings-grid :deep(.uni-forms-item) {
		flex-direction: column;
		align-items: stretch;
	}

	.settings-grid :deep(.uni-forms-item__label) {
		justify-content: flex-start;
	}

	.settings-grid :deep(.uni-forms-item__content) {
		margin-left: 0 !important;
	}
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


/* ===== Picker 选择器样式覆盖 ===== */
:deep(.uni-picker-container .uni-picker-highlight) {
	border-color: #42b983 !important;
}

:deep(.uni-picker-container .uni-picker-item-selected) {
	color: #42b983 !important;
}

:deep(.uni-system-choose-area a) {
	color: #42b983 !important;
}

:deep(.uni-picker-action-confirm) {
	color: #42b983 !important;
}

/* H5 picker 弹窗样式 */
:deep(.uni-picker__container .uni-picker__highlight) {
	border-color: rgba(66, 185, 131, 0.3) !important;
}

:deep(.uni-picker-view-indicator) {
	border-color: rgba(66, 185, 131, 0.3) !important;
}

/* picker 选中项样式 */
:deep(.picker-view-column) .picker-item-selected,
:deep(.uni-picker-view-column) .uni-picker-view-item-selected {
	color: #42b983 !important;
}

/* ===== 附件样式 ===== */
.attachment-list {
	margin-bottom: 16px;
}

.empty-placeholder {
	text-align: center;
	padding: 32px;
	color: #adb5bd;
	font-size: 14px;
}

/* 图片附件网格 */
.image-attachment-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
	gap: 12px;
	margin-bottom: 16px;
}

@media screen and (min-width: 768px) {
	.image-attachment-grid {
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 16px;
	}
}

.image-attachment-item {
	position: relative;
	aspect-ratio: 1;
	border-radius: 8px;
	overflow: hidden;
	cursor: pointer;
	transition: all 0.25s ease;
}

.image-attachment-item:hover {
	transform: scale(1.05);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.image-thumbnail {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.image-overlay {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.4);
	display: flex;
	align-items: center;
	justify-content: center;
	opacity: 0;
	transition: all 0.25s ease;
}

.image-attachment-item:hover .image-overlay {
	opacity: 1;
}

.image-delete {
	position: absolute;
	top: 6px;
	right: 6px;
	width: 24px;
	height: 24px;
	background-color: rgba(231, 76, 60, 0.9);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	opacity: 0;
	transition: all 0.25s ease;
	z-index: 10;
}

.image-attachment-item:hover .image-delete {
	opacity: 1;
}

.image-delete:hover {
	background-color: #e74c3c;
	transform: scale(1.1);
}

/* 非图片附件 */
.attachment-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px;
	background-color: #f8f9fa;
	border-radius: 8px;
	margin-bottom: 8px;
	transition: all 0.2s ease;
}

.attachment-item:hover {
	background-color: #e6fcf5;
}

.attachment-info {
	display: flex;
	align-items: center;
	gap: 8px;
	flex: 1;
	min-width: 0;
}

.attachment-name {
	font-size: 14px;
	color: #2c3e50;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.attachment-actions {
	display: flex;
	gap: 12px;
}

.attachment-action {
	font-size: 13px;
	color: #42b983;
	cursor: pointer;
	padding: 4px 8px;
	border-radius: 4px;
	transition: all 0.2s ease;
}

.attachment-action:hover {
	background-color: rgba(66, 185, 131, 0.1);
}

.attachment-action--danger {
	color: #e74c3c;
}

.attachment-action--danger:hover {
	background-color: rgba(231, 76, 60, 0.1);
}

/* 上传按钮 */
.upload-btn {
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	padding: 12px;
	background-color: #f0fdf7;
	border: 1px dashed #42b983;
	border-radius: 8px;
	color: #42b983;
	font-size: 14px;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.25s ease;
}

.upload-btn:hover {
	background-color: #e6fcf5;
	border-color: #359568;
	transform: translateY(-1px);
}

.upload-btn::after {
	border: none;
}

:deep(.file-picker) {
	margin-top: 0;
}

/* ===== 按钮组 ===== */
.button-group {
	display: flex;
	justify-content: center;
	gap: 16px;
	margin-top: 32px;
	padding: 0 16px;
}

.cancel-btn,
.submit-btn {
	flex: 1;
	max-width: 200px;
	padding: 14px 24px;
	font-size: 15px;
	font-weight: 500;
	border-radius: 8px;
	border: none;
	cursor: pointer;
	transition: all 0.25s ease;
}

.cancel-btn {
	background-color: #f8f9fa;
	color: #6c757d;
}

.cancel-btn:hover {
	background-color: #e9ecef;
}

.submit-btn {
	background-color: #42b983;
	color: #ffffff;
}

.submit-btn:hover {
	background-color: #359568;
	box-shadow: 0 4px 14px rgba(66, 185, 131, 0.3);
	transform: translateY(-2px);
}

.submit-btn:active {
	background-color: #2a7a53;
	transform: translateY(0);
}

.submit-btn::after,
.cancel-btn::after {
	border: none;
}

/* ===== uni-data-picker 样式 ===== */
:deep(.uni-data-picker) {
	border: 1px solid #e9ecef;
	border-radius: 8px;
	transition: all 0.25s ease;
	background-color: #ffffff;
}

:deep(.uni-data-picker:hover) {
	border-color: #42b983;
	background-color: #f0fdf7;
}

:deep(.uni-data-picker.is-focus) {
	border-color: #42b983 !important;
	box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1) !important;
	background-color: #fafdfb;
}

:deep(.uni-data-picker__input-text) {
	color: #2c3e50;
	font-size: 14px;
}

/* uni-icons 颜色 */
:deep(.uni-icons) {
	color: #42b983 !important;
}

/* uni-data-picker 弹出层样式，确保不被其他元素遮挡 */
:deep(.uni-data-picker__selector-item),
:deep(.uni-data-picker__selector-item-content),
:deep(.uni-data-picker__selector-scroll) {
	z-index: 9999 !important;
}

:deep(.uni-data-picker__selector) {
	z-index: 9999 !important;
	position: absolute;
}

/* PC 端优化 */
@media screen and (min-width: 768px) {
	.card-header {
		padding: 18px 24px;
	}

	.card-title {
		font-size: 17px;
	}

	.card-body {
		padding: 24px;
	}

	:deep(.uni-forms-item__label) {
		font-size: 15px;
		min-width: 100px !important;
	}

	.textarea-input {
		min-height: 140px;
		font-size: 15px;
	}

	.button-group {
		margin-top: 40px;
	}

	.cancel-btn,
	.submit-btn {
		max-width: 220px;
		padding: 16px 28px;
		font-size: 16px;
	}
}

@media screen and (min-width: 1200px) {
	.card-header {
		padding: 20px 28px;
	}

	.card-body {
		padding: 28px;
	}
}
</style>
