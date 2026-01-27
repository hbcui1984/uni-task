<!--
 * 已归档项目列表页面
 *
 * 功能说明：
 * - 展示当前用户参与过的已归档项目（作为管理员或成员）
 * - 点击项目进入任务列表页面（只读查看）
 * - 仅原管理员可取消归档
 *
 * 路由：/pages/opendb-projects/list-archived
-->
<template>
	<view class="container">
		<view class="uni-header">
			<view class="header-title">
				<text class="title-text">已归档项目</text>
				<text class="title-subtitle">查看已归档的历史项目</text>
			</view>
		</view>

		<unicloud-db ref="udb" v-slot:default="{data, loading, error}" collection="opendb-projects"
			where="(managers==$cloudEnv_uid || members==$cloudEnv_uid) && archived == true"
			field="_id,name,cover,description,archived_date,managers" :getone="false">
			<view v-if="error" class="error-message">{{error.message}}</view>
			<view v-else-if="loading" class="loading-state">
				<uni-load-more status="loading"></uni-load-more>
			</view>
			<view v-else-if="data && data.length > 0">
				<uni-list>
					<uni-list-item v-for="(item, index) in data" :key="index" showArrow :clickable="true"
						@click="handleItemClick(item._id, item.name)">
						<template v-slot:body>
							<view class="project-item">
								<view class="project-name">{{item.name}}</view>
								<view class="project-meta">
									<text class="archived-date" v-if="item.archived_date">
										归档于 {{formatDate(item.archived_date)}}
									</text>
								</view>
							</view>
						</template>
					</uni-list-item>
				</uni-list>
			</view>
			<view v-else class="empty-state">
				<uni-icons type="folder" size="48" color="#e9ecef"></uni-icons>
				<text class="empty-text">暂无已归档项目</text>
				<text class="empty-hint">归档的项目会显示在这里</text>
			</view>
		</unicloud-db>
	</view>
</template>

<script>
	export default {
		data() {
			return {}
		},
		onLoad() {
			uni.setNavigationBarTitle({
				title: '已归档项目'
			})
		},
		onReady() {
			this.$refs.udb.loadData()
		},
		methods: {
			handleItemClick(id, name) {
				uni.navigateTo({
					url: '/pages/opendb-task/list?id=' + id + "&name=" + name
				})
			},
			formatDate(timestamp) {
				if (!timestamp) return ''
				const date = new Date(timestamp)
				const year = date.getFullYear()
				const month = String(date.getMonth() + 1).padStart(2, '0')
				const day = String(date.getDate()).padStart(2, '0')
				return `${year}-${month}-${day}`
			}
		}
	}
</script>

<style scoped>
	.container {
		min-height: 100vh;
		background: linear-gradient(to bottom, #fafdfb, #f7f8fa);
		padding: 24px;
		max-width: 1400px;
		margin: 0 auto;
	}

	@media screen and (max-width: 767px) {
		.container {
			padding: 16px;
		}
	}

	@media screen and (min-width: 768px) {
		.container {
			padding: 32px 48px;
		}
	}

	.uni-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 24px;
		padding: 24px;
		background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
		border-radius: 12px;
		box-shadow: 0 4px 14px rgba(108, 117, 125, 0.2);
	}

	.header-title {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.title-text {
		color: #ffffff;
		font-size: 24px;
		font-weight: 700;
		letter-spacing: 0.5px;
	}

	.title-subtitle {
		color: rgba(255, 255, 255, 0.85);
		font-size: 13px;
		font-weight: 400;
	}

	@media screen and (max-width: 767px) {
		.uni-header {
			padding: 16px;
		}

		.title-text {
			font-size: 20px;
		}

		.title-subtitle {
			font-size: 12px;
		}
	}

	@media screen and (min-width: 768px) {
		.uni-header {
			padding: 28px 36px;
		}

		.title-text {
			font-size: 28px;
		}
	}

	.project-item {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.project-name {
		color: #2c3e50;
		font-weight: 500;
		font-size: 15px;
	}

	.project-meta {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.archived-date {
		color: #adb5bd;
		font-size: 12px;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 64px 24px;
		background-color: #ffffff;
		border-radius: 12px;
		border: 2px dashed #e9ecef;
	}

	.empty-text {
		margin-top: 16px;
		color: #6c757d;
		font-size: 16px;
		font-weight: 500;
	}

	.empty-hint {
		margin-top: 8px;
		color: #adb5bd;
		font-size: 13px;
	}

	.error-message {
		padding: 40px;
		text-align: center;
		background-color: #fef0f0;
		border: 1px solid #fde2e2;
		border-radius: 8px;
		color: #e74c3c;
		font-size: 14px;
	}

	.loading-state {
		padding: 40px;
		text-align: center;
	}
</style>

<!-- 无 scoped 样式块，用于覆盖子组件样式（兼容小程序） -->
<style lang="scss">
/* list-archived.vue - uni-list 样式 */
.container .uni-list {
	background-color: transparent;
	border: none;
}

.container .uni-list-item {
	background-color: #ffffff;
	border-radius: 8px;
	margin-bottom: 12px;
	border: 1px solid #e9ecef;
	transition: all 0.25s ease;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.container .uni-list-item:hover {
	border-color: #6c757d;
	box-shadow: 0 4px 12px rgba(108, 117, 125, 0.15);
	transform: translateY(-2px);
}

.container .uni-list-item__container {
	padding: 16px 20px;
}

.container .uni-list-item .uni-icons {
	color: #adb5bd;
	transition: all 0.25s ease;
}

.container .uni-list-item:hover .uni-icons {
	color: #6c757d;
}

@media screen and (min-width: 768px) {
	.container .uni-list-item {
		margin-bottom: 14px;
		border-radius: 10px;
	}

	.container .uni-list-item__container {
		padding: 20px 24px;
	}

	.container .project-name {
		font-size: 16px;
	}
}
</style>
