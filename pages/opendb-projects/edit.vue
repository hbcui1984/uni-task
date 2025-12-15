<!--
 * 项目设置页面
 *
 * 功能说明：
 * - 查看和编辑项目基本信息（名称、描述、封面）
 * - 展示项目统计数据（成员数、任务数、完成率）
 * - 管理员可归档/取消归档项目
 * - 管理员可删除项目（危险操作）
 * - 非管理员仅可查看，无法编辑
 *
 * 路由：/pages/opendb-projects/edit?id={projectId}
 * 权限：所有项目成员可查看，管理员可编辑
-->
<template>
	<view class="page-wrapper">
		<!-- 自定义导航栏（仅移动端显示） -->
		<CustomNavBar v-if="!isWideScreen" title="项目设置" />

		<!-- PC端页面标题栏 -->
		<view v-else class="pc-page-header">
			<view class="pc-header-left">
				<view class="pc-back-btn" @click="handleCancel">
					<uni-icons type="left" size="18" color="#42b983"></uni-icons>
				</view>
				<text class="pc-title">项目设置</text>
			</view>
		</view>

		<view class="uni-container">
			<!-- 页面标题 -->
			<view class="page-header">
				<text class="header-title">{{ formData.name || '项目设置' }}</text>
				<text class="header-subtitle">管理项目的基本信息和配置</text>
			</view>

		<uni-forms ref="form" :value="formData" validate-trigger="submit" err-show-type="toast" label-width="90px">
			<!-- 基本信息 -->
			<view class="section">
				<view class="section-title">
					<uni-icons type="info-filled" size="18" color="#42b983"></uni-icons>
					<text>基本信息</text>
				</view>

				<!-- 项目封面 -->
				<uni-forms-item label="项目封面">
					<view class="cover-upload">
						<view class="cover-preview" v-if="formData.cover && formData.cover.url">
							<image :src="formData.cover.url" mode="aspectFill" class="cover-image"></image>
							<view class="cover-actions" v-if="isManager">
								<button type="default" size="mini" class="btn-remove-cover" @click="handleRemoveCover">
									<uni-icons type="trash" size="14" color="#e74c3c"></uni-icons>
									删除
								</button>
							</view>
						</view>
						<view class="cover-upload-btn" v-else-if="isManager" @click="handleUploadCover">
							<uni-icons type="image" size="32" color="#adb5bd"></uni-icons>
							<text class="upload-text">点击上传封面</text>
							<text class="upload-hint">建议尺寸 400×300，支持 JPG/PNG，不超过 2MB</text>
						</view>
						<view class="cover-empty" v-else>
							<uni-icons type="image" size="32" color="#adb5bd"></uni-icons>
							<text class="empty-text">暂无封面</text>
						</view>
					</view>
				</uni-forms-item>

				<uni-forms-item name="name" label="项目名称" required>
					<uni-easyinput v-model="formData.name" placeholder="请输入项目名称（2-50字符）" trim="both" :disabled="!isManager" />
				</uni-forms-item>

				<uni-forms-item name="description" label="项目描述">
					<textarea
						v-model="formData.description"
						class="uni-textarea-border"
						placeholder="请输入项目描述（最多500字符）"
						maxlength="500"
						:disabled="!isManager"
					></textarea>
				</uni-forms-item>
			</view>

			<!-- 项目统计 -->
			<view class="section" v-if="projectStats">
				<view class="section-title">
					<uni-icons type="bars" size="18" color="#42b983"></uni-icons>
					<text>项目统计</text>
				</view>

				<view class="stats-grid">
					<view class="stat-item">
						<text class="stat-value">{{ projectStats.memberCount }}</text>
						<text class="stat-label">成员数量</text>
					</view>
					<view class="stat-item">
						<text class="stat-value">{{ projectStats.taskCount }}</text>
						<text class="stat-label">任务总数</text>
					</view>
					<view class="stat-item">
						<text class="stat-value">{{ projectStats.completedCount }}</text>
						<text class="stat-label">已完成</text>
					</view>
					<view class="stat-item">
						<text class="stat-value">{{ projectStats.completionRate }}%</text>
						<text class="stat-label">完成率</text>
					</view>
				</view>
			</view>

			<!-- 成员管理 -->
			<view class="section">
				<view class="section-title">
					<uni-icons type="person-filled" size="18" color="#42b983"></uni-icons>
					<text>项目成员</text>
					<button v-if="isManager" type="default" size="mini" class="btn-manage-members" @click="handleManageMembers">
						管理成员
					</button>
				</view>

				<view class="member-summary" v-if="memberList.length > 0">
					<view class="member-avatars">
						<view v-for="(member, index) in memberList.slice(0, 5)" :key="member._id" class="member-avatar">
							<text class="avatar-text">{{ getAvatarText(member.nickname) }}</text>
						</view>
						<view v-if="memberList.length > 5" class="member-avatar more">
							<text class="avatar-text">+{{ memberList.length - 5 }}</text>
						</view>
					</view>
					<text class="member-count">共 {{ memberList.length }} 名成员</text>
				</view>
				<view v-else class="empty-members">
					<text>暂无成员</text>
				</view>
			</view>

			<!-- 危险操作区 -->
			<view class="section danger-zone" v-if="isManager">
				<view class="section-title">
					<uni-icons type="info-filled" size="18" color="#e74c3c"></uni-icons>
					<text>危险操作</text>
				</view>

				<!-- 归档项目 -->
				<view class="danger-item">
					<view class="danger-item__info">
						<text class="danger-item__title">{{ formData.archived ? '取消归档' : '归档项目' }}</text>
						<text class="danger-item__desc">
							{{ formData.archived ? '取消归档后，项目将重新出现在活跃列表中' : '归档后，项目将从活跃列表中移除，但数据会被保留' }}
						</text>
					</view>
					<button
						:type="formData.archived ? 'primary' : 'default'"
						size="mini"
						class="danger-item__btn"
						:class="{ 'btn-warning': !formData.archived }"
						@click="handleToggleArchive"
					>
						{{ formData.archived ? '取消归档' : '归档' }}
					</button>
				</view>

				<!-- 删除项目 -->
				<view class="danger-item danger-item--delete">
					<view class="danger-item__info">
						<text class="danger-item__title">删除项目</text>
						<text class="danger-item__desc">删除后，项目及其所有任务、分组、日志将被永久删除，此操作不可恢复</text>
					</view>
					<button
						type="default"
						size="mini"
						class="danger-item__btn btn-danger"
						@click="handleDeleteProject"
					>
						删除
					</button>
				</view>
			</view>

			<!-- 按钮组 -->
			<view class="uni-button-group">
				<button type="default" class="uni-button btn-cancel" @click="handleCancel">返回</button>
				<button v-if="isManager" type="primary" class="uni-button" @click="submit">保存修改</button>
			</view>
		</uni-forms>

		<!-- 权限提示 -->
		<view class="permission-notice" v-if="!isManager">
			<uni-icons type="info-filled" size="16" color="#f39c12"></uni-icons>
			<text>您不是项目管理员，只能查看项目信息，无法进行修改</text>
		</view>
		</view>
	</view>
</template>

<script>
	import {
		validator
	} from '../../js_sdk/validator/opendb-projects.js';
	import CustomNavBar from '@/components/CustomNavBar/CustomNavBar.vue'
	import { formatDateTime } from '@/utils/date.js'
	import { getAvatarText } from '@/utils/task.js'
	import { responsiveMixin } from '@/utils/responsive.js'
	import { getCurrentUserId, isProjectManager } from '@/utils/auth.js'

	const db = uniCloud.database();
	const dbCollectionName = 'opendb-projects';

	function getValidator(fields) {
		let result = {}
		for (let key in validator) {
			if (fields.indexOf(key) > -1) {
				result[key] = validator[key]
			}
		}
		return result
	}

	export default {
		components: {
			CustomNavBar
		},
		mixins: [responsiveMixin],
		data() {
			return {
				formData: {
					"name": "",
					"description": "",
					"cover": null,
					"archived": false,
					"archived_date": null,
					"members": [],
					"managers": []
				},
				formOptions: {},
				rules: {
					...getValidator(["name", "description"])
				},
				projectStats: null,
				memberList: [],
				loading: false,
				isManager: false, // 是否是项目管理员
				currentUserId: '' // 当前用户ID
			}
		},
		onLoad(e) {
			console.log('project edit page load');
			const id = e.id
			this.formDataId = id

			// 获取当前用户ID
			this.currentUserId = getCurrentUserId()

			this.getDetail(id)
		},
		onReady() {
			this.$refs.form.setRules(this.rules)
		},
		methods: {
			/**
			 * 触发表单提交
			 */
			submit() {
				uni.showLoading({
					mask: true
				})
				this.$refs.form.submit().then((res) => {
					this.submitForm(res)
				}).catch((errors) => {
					uni.hideLoading()
				})
			},

			async submitForm(value) {
				// 使用云对象提交数据（权限在云对象中校验）
				try {
					const projectCo = uniCloud.importObject('project-co')
					const res = await projectCo.updateProject(this.formDataId, value)
					if (res.errCode && res.errCode !== 0) {
						throw new Error(res.errMsg || '更新失败')
					}
					uni.showToast({
						icon: 'none',
						title: '修改成功'
					})
					this.getOpenerEventChannel().emit('refreshData')
					setTimeout(() => uni.navigateBack(), 500)
				} catch (err) {
					uni.showModal({
						content: err.message || '请求服务失败',
						showCancel: false
					})
				} finally {
					uni.hideLoading()
				}
			},

			/**
			 * 获取表单数据
			 * @param {Object} id
			 */
			async getDetail(id) {
				uni.showLoading({
					mask: true
				})
				try {
					const res = await db.collection(dbCollectionName).doc(id).get()
					const data = res.result.data[0]
					if (data) {
						this.formData = data

						// 检查权限
						this.checkIsManager()

						// 加载成员列表和统计数据
						await Promise.all([
							this.loadMemberList(),
							this.loadProjectStats()
						])
					}
				} catch (err) {
					uni.showModal({
						content: err.message || '请求服务失败',
						showCancel: false
					})
				} finally {
					uni.hideLoading()
				}
			},

			/**
			 * 加载成员列表
			 */
			async loadMemberList() {
				try {
					const memberIds = [...new Set([
						...(this.formData.members || []),
						...(this.formData.managers || [])
					])]

					if (memberIds.length === 0) {
						this.memberList = []
						return
					}

					const dbCmd = db.command
					const res = await db.collection('uni-id-users')
						.where({
							_id: dbCmd.in(memberIds)
						})
						.field('_id,nickname')
						.get()

					this.memberList = res.result.data
				} catch (err) {
					console.error('加载成员列表失败:', err)
				}
			},

			/**
			 * 加载项目统计数据
			 */
			async loadProjectStats() {
				try {
					// 获取任务总数和完成数
					const [totalRes, completedRes] = await Promise.all([
						db.collection('opendb-task')
							.where({
								project_id: this.formDataId
							})
							.count(),
						db.collection('opendb-task')
							.where({
								project_id: this.formDataId,
								status: 2 // 已完成
							})
							.count()
					])

					const taskCount = totalRes.result.total
					const completedCount = completedRes.result.total
					const completionRate = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0

					this.projectStats = {
						memberCount: this.memberList.length,
						taskCount,
						completedCount,
						completionRate
					}
				} catch (err) {
					console.error('加载项目统计失败:', err)
				}
			},

			/**
			 * 管理成员
			 */
			handleManageMembers() {
				uni.navigateTo({
					url: './member?id=' + this.formDataId,
					events: {
						refreshData: () => {
							this.getDetail(this.formDataId)
						}
					}
				})
			},

			/**
			 * 取消
			 */
			handleCancel() {
				uni.navigateBack()
			},

			/**
			 * 检查当前用户是否是管理员
			 */
			checkIsManager() {
				this.isManager = isProjectManager(this.formData.managers)
			},

			/**
			 * 上传封面
			 */
			handleUploadCover() {
				if (!this.isManager) {
					uni.showToast({
						title: '仅管理员可上传封面',
						icon: 'none'
					})
					return
				}

				uni.chooseImage({
					count: 1,
					sizeType: ['compressed'],
					sourceType: ['album', 'camera'],
					success: (res) => {
						const tempFilePath = res.tempFilePaths[0]

						// 检查文件大小（2MB）
						uni.getFileInfo({
							filePath: tempFilePath,
							success: (info) => {
								if (info.size > 2 * 1024 * 1024) {
									uni.showToast({
										title: '图片大小不能超过2MB',
										icon: 'none'
									})
									return
								}

								// 上传到云存储
								uni.showLoading({
									title: '上传中...'
								})

								uniCloud.uploadFile({
									filePath: tempFilePath,
									cloudPath: `project-covers/${this.formDataId}_${Date.now()}.jpg`,
									success: async (uploadRes) => {
										const coverData = {
											url: uploadRes.fileID,
											name: uploadRes.fileID.split('/').pop(),
											size: info.size
										}
										this.formData.cover = coverData

										// 立即保存到数据库
										try {
											await db.collection(dbCollectionName).doc(this.formDataId).update({
												cover: coverData
											})
											uni.showToast({
												title: '上传成功',
												icon: 'success'
											})
										} catch (err) {
											console.error('保存封面失败:', err)
											uni.showToast({
												title: '保存失败',
												icon: 'none'
											})
										}
									},
									fail: (err) => {
										console.error('上传失败:', err)
										uni.showToast({
											title: '上传失败',
											icon: 'none'
										})
									},
									complete: () => {
										uni.hideLoading()
									}
								})
							}
						})
					}
				})
			},

			/**
			 * 删除封面
			 */
			handleRemoveCover() {
				if (!this.isManager) {
					uni.showToast({
						title: '仅管理员可删除封面',
						icon: 'none'
					})
					return
				}

				uni.showModal({
					title: '确认删除',
					content: '确定要删除项目封面吗？',
					success: async (res) => {
						if (res.confirm) {
							// 删除云存储文件
							if (this.formData.cover && this.formData.cover.url) {
								uniCloud.deleteFile({
									fileList: [this.formData.cover.url]
								}).then(() => {
									console.log('云存储文件已删除')
								}).catch(err => {
									console.error('删除云存储文件失败:', err)
								})
							}

							this.formData.cover = null

							// 立即保存到数据库
							try {
								await db.collection(dbCollectionName).doc(this.formDataId).update({
									cover: null
								})
								uni.showToast({
									title: '已删除封面',
									icon: 'success'
								})
							} catch (err) {
								console.error('保存失败:', err)
								uni.showToast({
									title: '删除失败',
									icon: 'none'
								})
							}
						}
					}
				})
			},

			/**
			 * 切换归档状态
			 */
			handleToggleArchive() {
				if (!this.isManager) {
					uni.showToast({
						title: '仅管理员可归档项目',
						icon: 'none'
					})
					return
				}

				const isArchiving = !this.formData.archived
				const message = isArchiving ? '归档后项目将从活跃列表中移除，确认归档吗？' : '确认要取消归档吗？'

				uni.showModal({
					title: isArchiving ? '确认归档' : '取消归档',
					content: message,
					success: (res) => {
						if (res.confirm) {
							this.formData.archived = isArchiving
							this.formData.archived_date = isArchiving ? Date.now() : null

							// 立即保存
							this.submitForm(this.formData)
						}
					}
				})
			},

			/**
			 * 删除项目
			 */
			handleDeleteProject() {
				if (!this.isManager) {
					uni.showToast({
						title: '仅管理员可删除项目',
						icon: 'none'
					})
					return
				}

				uni.showModal({
					title: '确认删除',
					content: `确定要删除项目「${this.formData.name}」吗？此操作不可恢复，项目下的所有任务、分组、日志都将被永久删除！`,
					confirmText: '删除',
					confirmColor: '#e74c3c',
					success: async (res) => {
						if (res.confirm) {
							uni.showLoading({ title: '删除中...', mask: true })
							try {
								// 使用云对象删除项目（权限在云对象中校验）
								const projectCo = uniCloud.importObject('project-co')
								const result = await projectCo.deleteProject(this.formDataId)

								if (result.errCode && result.errCode !== 0) {
									throw new Error(result.errMsg || '删除失败')
								}

								uni.hideLoading()
								uni.showToast({
									title: '项目已删除',
									icon: 'success'
								})
								// 跳转到项目列表
								setTimeout(() => {
									uni.reLaunch({
										url: '/pages/opendb-projects/list'
									})
								}, 1000)
							} catch (e) {
								uni.hideLoading()
								console.error('删除项目失败:', e)
								uni.showToast({
									title: e.message || '删除失败',
									icon: 'none'
								})
							}
						}
					}
				})
			},

			/**
			 * 格式化日期
			 */
			formatDate: formatDateTime,

			/**
			 * 获取头像文字
			 */
			getAvatarText
		}
	}
</script>

<style lang="scss">
	page {
		background-color: #f7f8fa;
		min-height: 100vh;
	}

	.page-wrapper {
		min-height: 100vh;
		background-color: #f7f8fa;
	}

	/* ===== PC端页面标题栏 ===== */
	.pc-page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 0;
		max-width: 1000px;
		margin: 0 auto;
	}

	@media screen and (min-width: 768px) {
		.pc-page-header {
			padding: 16px 20px;
		}
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

	.pc-title {
		font-size: 18px;
		font-weight: 600;
		color: #2c3e50;
	}

	.uni-container {
		max-width: 720px;
		margin: 0 auto;
		background-color: #ffffff;
		border-radius: 0;
		box-shadow: none;
		padding: 0;
		overflow: hidden;
	}

	/* PC 端优化 */
	@media screen and (min-width: 768px) {
		.uni-container {
			max-width: 880px;
			margin: 20px auto;
			border-radius: 12px;
			box-shadow: 0 4px 14px rgba(66, 185, 131, 0.1);
		}
	}

	@media screen and (min-width: 1200px) {
		.uni-container {
			max-width: 1000px;
			margin: 32px auto;
			border-radius: 16px;
		}
	}

	/* 页面标题 */
	.page-header {
		padding: 32px 24px 24px;
		background: linear-gradient(135deg, #42b983 0%, #359568 100%);
		border-bottom: 1px solid #e9ecef;

		.header-title {
			display: block;
			font-size: 24px;
			font-weight: 600;
			color: #ffffff;
			margin-bottom: 8px;
		}

		.header-subtitle {
			display: block;
			font-size: 14px;
			color: rgba(255, 255, 255, 0.85);
		}
	}

	@media screen and (min-width: 768px) {
		.page-header {
			padding: 40px 40px 28px;

			.header-title {
				font-size: 28px;
			}

			.header-subtitle {
				font-size: 15px;
			}
		}
	}

	/* Section 分区 */
	.section {
		padding: 24px;
		border-bottom: 1px solid #e9ecef;

		&:last-of-type {
			border-bottom: none;
		}

		.section-title {
			display: flex;
			align-items: center;
			gap: 8px;
			font-size: 16px;
			font-weight: 600;
			color: #2c3e50;
			margin-bottom: 20px;
			position: relative;

			text {
				flex: 1;
			}

			.btn-manage-members {
				padding: 6px 16px;
				font-size: 13px;
				border-radius: 6px;
				border: 1px solid #42b983;
				color: #42b983;
				background-color: transparent;
				transition: all 0.25s ease;
				height: auto;
				line-height: 1.5;

				&:hover {
					background-color: #f0fdf7;
				}
			}
		}
	}

	@media screen and (min-width: 768px) {
		.section {
			padding: 28px 40px;

			.section-title {
				font-size: 17px;
				margin-bottom: 24px;

				.btn-manage-members {
					font-size: 14px;
				}
			}
		}
	}

	/* 项目统计 */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 16px;

		@media screen and (min-width: 768px) {
			grid-template-columns: repeat(4, 1fr);
			gap: 20px;
		}

		.stat-item {
			padding: 20px;
			background: linear-gradient(135deg, #f0fdf7 0%, #e6fcf5 100%);
			border-radius: 12px;
			text-align: center;
			transition: all 0.25s ease;

			&:hover {
				transform: translateY(-2px);
				box-shadow: 0 4px 12px rgba(66, 185, 131, 0.15);
			}

			.stat-value {
				display: block;
				font-size: 28px;
				font-weight: 700;
				color: #42b983;
				margin-bottom: 8px;
				line-height: 1;
			}

			.stat-label {
				display: block;
				font-size: 13px;
				color: #6c757d;
			}

			@media screen and (min-width: 768px) {
				padding: 24px;

				.stat-value {
					font-size: 32px;
				}

				.stat-label {
					font-size: 14px;
				}
			}
		}
	}

	/* 成员摘要 */
	.member-summary {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 16px;
		background-color: #f7f8fa;
		border-radius: 8px;

		.member-avatars {
			display: flex;
			align-items: center;

			.member-avatar {
				width: 36px;
				height: 36px;
				border-radius: 50%;
				background: linear-gradient(135deg, #42b983 0%, #359568 100%);
				display: flex;
				align-items: center;
				justify-content: center;
				margin-right: -8px;
				border: 2px solid #ffffff;
				transition: all 0.25s ease;

				&:hover {
					transform: scale(1.1);
					z-index: 10;
				}

				&.more {
					background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
				}

				.avatar-text {
					font-size: 14px;
					font-weight: 600;
					color: #ffffff;
				}

				@media screen and (min-width: 768px) {
					width: 40px;
					height: 40px;

					.avatar-text {
						font-size: 15px;
					}
				}
			}
		}

		.member-count {
			font-size: 14px;
			color: #6c757d;
			margin-left: 8px;
		}
	}

	.empty-members {
		padding: 32px;
		text-align: center;
		color: #adb5bd;
		font-size: 14px;
		background-color: #f7f8fa;
		border-radius: 8px;
	}

	/* 封面上传 */
	.cover-upload {
		width: 100%;

		.cover-preview {
			position: relative;
			width: 100%;
			max-width: 400px;
			height: 200px;
			border-radius: 8px;
			overflow: hidden;
			background-color: #f7f8fa;

			@media screen and (min-width: 768px) {
				height: 240px;
			}

			.cover-image {
				width: 100%;
				height: 100%;
				object-fit: cover;
			}

			.cover-actions {
				position: absolute;
				bottom: 0;
				left: 0;
				right: 0;
				padding: 12px;
				background: linear-gradient(to top, rgba(0,0,0,0.6), transparent);
				display: flex;
				justify-content: flex-end;

				.btn-remove-cover {
					padding: 6px 12px;
					font-size: 13px;
					border-radius: 6px;
					border: 1px solid rgba(255, 255, 255, 0.3);
					color: #ffffff;
					background-color: rgba(0, 0, 0, 0.3);
					display: flex;
					align-items: center;
					gap: 4px;
					height: auto;
					line-height: 1.5;

					&:hover {
						background-color: rgba(231, 76, 60, 0.8);
						border-color: #e74c3c;
					}
				}
			}
		}

		.cover-upload-btn {
			width: 100%;
			max-width: 400px;
			height: 200px;
			border: 2px dashed #e9ecef;
			border-radius: 8px;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 8px;
			cursor: pointer;
			transition: all 0.25s ease;
			background-color: #f7f8fa;

			@media screen and (min-width: 768px) {
				height: 240px;
			}

			&:hover {
				border-color: #42b983;
				background-color: #f0fdf7;
			}

			.upload-text {
				font-size: 15px;
				color: #6c757d;
				font-weight: 500;
			}

			.upload-hint {
				font-size: 12px;
				color: #adb5bd;
				text-align: center;
				padding: 0 20px;
			}
		}

		.cover-empty {
			width: 100%;
			max-width: 400px;
			height: 200px;
			border: 1px solid #e9ecef;
			border-radius: 8px;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 8px;
			background-color: #f7f8fa;

			@media screen and (min-width: 768px) {
				height: 240px;
			}

			.empty-text {
				font-size: 14px;
				color: #adb5bd;
			}
		}
	}

	/* 危险操作区 */
	.danger-zone {
		.section-title {
			text {
				color: #e74c3c !important;
			}
		}
	}

	.danger-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		background-color: #f7f8fa;
		border-radius: 8px;
		margin-bottom: 12px;
		gap: 16px;

		@media screen and (min-width: 768px) {
			padding: 20px 24px;
		}

		&:last-child {
			margin-bottom: 0;
		}

		&--delete {
			background-color: #fef2f2;
			border: 1px solid #fecaca;
		}
	}

	.danger-item__info {
		flex: 1;
		min-width: 0;
	}

	.danger-item__title {
		display: block;
		font-size: 15px;
		font-weight: 600;
		color: #2c3e50;
		margin-bottom: 4px;

		@media screen and (min-width: 768px) {
			font-size: 16px;
		}
	}

	.danger-item__desc {
		display: block;
		font-size: 13px;
		color: #6c757d;
		line-height: 1.5;

		@media screen and (min-width: 768px) {
			font-size: 14px;
		}
	}

	.danger-item--delete .danger-item__title {
		color: #dc2626;
	}

	.danger-item--delete .danger-item__desc {
		color: #991b1b;
	}

	.danger-item__btn {
		flex-shrink: 0;
		padding: 8px 20px !important;
		font-size: 13px !important;
		border-radius: 6px !important;
		font-weight: 500 !important;
		transition: all 0.25s ease !important;
		height: auto !important;
		line-height: 1.5 !important;

		@media screen and (min-width: 768px) {
			padding: 10px 24px !important;
			font-size: 14px !important;
		}
	}

	.btn-warning {
		background-color: #fef3c7 !important;
		border: 1px solid #f59e0b !important;
		color: #d97706 !important;

		&:hover {
			background-color: #fde68a !important;
		}
	}

	.btn-danger {
		background-color: #fee2e2 !important;
		border: 1px solid #ef4444 !important;
		color: #dc2626 !important;

		&:hover {
			background-color: #ef4444 !important;
			color: #ffffff !important;
		}
	}

	/* 权限提示 */
	.permission-notice {
		margin: 20px 24px;
		padding: 16px;
		background-color: #fff9e6;
		border: 1px solid #f39c12;
		border-radius: 8px;
		display: flex;
		align-items: center;
		gap: 12px;
		color: #d68910;
		font-size: 14px;

		@media screen and (min-width: 768px) {
			margin: 20px 40px;
			padding: 18px;
			font-size: 15px;
		}
	}

	/* 输入框样式 */
	.uni-input-border,
	.uni-textarea-border {
		width: 100%;
		font-size: 14px;
		color: #2c3e50;
		border: 1px solid #e9ecef;
		border-radius: 6px;
		box-sizing: border-box;
		transition: all 0.25s ease;
	}

	.uni-input-border:focus,
	.uni-textarea-border:focus {
		outline: none;
		border-color: #42b983;
		box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1);
	}

	.uni-input-border {
		padding: 0 10px;
		height: 35px;
	}

	.uni-textarea-border {
		padding: 12px;
		height: 120px;
		resize: vertical;
		line-height: 1.6;

		@media screen and (min-width: 768px) {
			height: 140px;
			font-size: 15px;
		}
	}

	/* 按钮组 */
	.uni-button-group {
		padding: 24px;
		display: flex;
		justify-content: center;
		gap: 16px;
		background-color: #f7f8fa;
		border-top: 1px solid #e9ecef;

		@media screen and (min-width: 768px) {
			padding: 28px 40px;
		}
	}

	.uni-button {
		flex: 1;
		max-width: 200px;
		padding: 14px 24px;
		font-size: 15px;
		font-weight: 500;
		border-radius: 8px;
		line-height: 1;
		margin: 0;
		transition: all 0.25s ease;

		&.btn-cancel {
			border: 1px solid #e9ecef;
			color: #6c757d;

			&:hover {
				border-color: #42b983;
				color: #42b983;
				background-color: #f0fdf7;
			}
		}

		@media screen and (min-width: 768px) {
			max-width: 220px;
			padding: 16px 28px;
			font-size: 16px;
		}

		@media screen and (min-width: 1200px) {
			max-width: 240px;
			padding: 18px 32px;
			font-size: 17px;
			border-radius: 10px;
		}
	}

	/* 主要按钮样式 - 绿色主题 */
	:deep(button[type="primary"]) {
		background-color: #42b983 !important;
		border-color: #42b983 !important;
		color: #ffffff;
	}

	:deep(button[type="primary"]:hover) {
		background-color: #359568 !important;
		box-shadow: 0 4px 14px rgba(66, 185, 131, 0.3);
		transform: translateY(-2px);
	}

	:deep(button[type="primary"]:active) {
		background-color: #2a7a53 !important;
		transform: translateY(0);
	}

	/* uni-easyinput 样式优化 */
	:deep(.uni-easyinput__content) {
		border: 1px solid #e9ecef;
		border-radius: 6px;
		transition: all 0.25s ease;
	}

	:deep(.uni-easyinput__content:hover) {
		border-color: #42b983;
		background-color: #f0fdf7;
	}

	:deep(.is-focused .uni-easyinput__content) {
		border-color: #42b983 !important;
		box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1);
	}

	/* 清除图标颜色 - 绿色主题 */
	:deep(.uni-easyinput__content-clear-icon) {
		color: #42b983 !important;
	}

	:deep(.uni-icons) {
		color: #42b983 !important;
	}

	/* 清除按钮hover效果 */
	:deep(.uni-easyinput__content-clear-icon:hover) {
		color: #359568 !important;
	}

	:deep(.uni-forms-item__label) {
		color: #2c3e50;
		font-weight: 500;
		font-size: 14px;
	}

	:deep(.uni-forms-item) {
		margin-bottom: 20px;

		@media screen and (min-width: 768px) {
			margin-bottom: 24px;
		}
	}

	:deep(.uni-forms-item__content) {
		flex: 1;
	}

	@media screen and (min-width: 768px) {
		:deep(.uni-forms-item__label) {
			font-size: 15px !important;
			min-width: 100px !important;
		}
	}

	@media screen and (min-width: 1200px) {
		:deep(.uni-forms-item__label) {
			font-size: 16px !important;
			min-width: 110px !important;
		}
	}
</style>
