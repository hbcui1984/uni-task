<!--
 * 项目列表页面
 *
 * 功能说明：
 * - 展示当前用户参与的所有项目（作为管理员或成员）
 * - 支持新建项目和通过邀请码加入项目
 * - 自动过滤已归档的项目
 * - 点击项目进入任务列表页面
 * - 底部提供已归档项目入口
 *
 * 路由：/pages/opendb-projects/list
-->
<template>
	<view class="container">
		<view class="uni-header">
			<view class="header-title">
				<text class="title-text">我的项目</text>
				<text class="title-subtitle">管理和跟踪您的所有项目</text>
			</view>
			<view class="header-actions">
				<button type="default" @click="joinProject" class="uni-button secondary">加入项目</button>
				<button type="default" @click="addProject" class="uni-button">新建项目</button>
			</view>
		</view>
		<unicloud-db ref="udb" v-slot:default="{data, loading, error}" collection="opendb-projects"
			where="(managers==$cloudEnv_uid || members==$cloudEnv_uid) && archived != true"
			field="_id,name,cover,description">
			<view v-if="error" class="error-message">{{error.message}}</view>
			<view v-else-if="loading" class="loading-state">
				<uni-load-more status="loading"></uni-load-more>
			</view>
			<view v-else-if="data && data.length > 0">
				<uni-list>
					<uni-list-item v-for="(item, index) in data" :key="index" showArrow :clickable="true"
						@click="handleItemClick(item._id, item.name)">
						<template v-slot:body>
							{{item.name}}
						</template>
					</uni-list-item>
				</uni-list>
			</view>
			<view v-else class="empty-state">
				<uni-icons type="folder" size="48" color="#e9ecef"></uni-icons>
				<text class="empty-text">暂无项目</text>
				<text class="empty-hint">点击上方按钮新建项目或加入已有项目</text>
			</view>
		</unicloud-db>

		<!-- 已归档项目入口 -->
		<view class="archived-link" @click="gotoArchivedProjects">
			<uni-icons type="folder" size="16" color="#adb5bd"></uni-icons>
			<text class="archived-link-text">查看已归档项目</text>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {}
		},
		onPullDownRefresh() {
			this.$refs.udb.loadData({
				clear: true
			}, () => {
				uni.stopPullDownRefresh()
			})
		},
		onLoad() {
			uni.$on('refresh-projects', () => {
				this.$refs.udb && this.$refs.udb.loadData()
			})
		},
		onShow() {
			// 每次显示时刷新数据
			this.$refs.udb && this.$refs.udb.loadData()
		},
		methods: {
			handleItemClick(id, name) {
				uni.navigateTo({
					url: '/pages/opendb-task/list?id=' + id + "&name=" + name
				})
			},
			addProject() {
				// 打开新增页面
				uni.navigateTo({
					url: './add',
					events: {
						// 监听新增数据成功后, 刷新当前页面数据
						refreshData: () => {
							this.$refs.udb.loadData({
								clear: true
							})
						}
					}
				})
			},
			gotoMyTask() {
				// 打开我的任务页面
				uni.navigateTo({
					url: '../opendb-task/myTask'
				})
			},
			joinProject() {
				// 打开加入项目页面
				uni.navigateTo({
					url: './join'
				})
			},
			gotoArchivedProjects() {
				// 打开已归档项目页面
				uni.navigateTo({
					url: './list-archived'
				})
			}
		}
	}
</script>

<style scoped>
	.container {
		min-height: 100vh;
		background: linear-gradient(to bottom, #fafdfb, #f7f8fa);
		padding: 24px;
		padding-bottom: calc(24px + var(--tabbar-height, 50px) + var(--safe-area-bottom, 0px));
		max-width: 1400px;
		margin: 0 auto;
	}

	/* 移动端容器优化 */
	@media screen and (max-width: 767px) {
		.container {
			padding: 16px;
			padding-bottom: calc(16px + var(--tabbar-height, 50px) + var(--safe-area-bottom, 0px));
		}
	}

	/* PC 端容器优化 */
	@media screen and (min-width: 768px) {
		.container {
			padding: 32px 48px;
			padding-bottom: 32px;
		}
	}

	@media screen and (min-width: 1200px) {
		.container {
			padding: 40px 64px;
		}
	}

	.uni-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 24px;
		padding: 24px;
		background: linear-gradient(135deg, #42b983 0%, #359568 100%);
		border-radius: 12px;
		box-shadow: 0 4px 14px rgba(66, 185, 131, 0.2);
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

	/* PC 端标题优化 */
	@media screen and (min-width: 768px) {
		.uni-header {
			padding: 28px 36px;
			margin-bottom: 28px;
		}

		.title-text {
			font-size: 28px;
			letter-spacing: 1px;
		}

		.title-subtitle {
			font-size: 14px;
		}
	}

	@media screen and (min-width: 1200px) {
		.uni-header {
			padding: 32px 42px;
			margin-bottom: 32px;
			border-radius: 16px;
		}

		.title-text {
			font-size: 32px;
		}

		.title-subtitle {
			font-size: 15px;
		}
	}

	.header-actions {
		display: flex;
		gap: 12px;
	}

	/* 移动端头部和按钮优化 */
	@media screen and (max-width: 767px) {
		.uni-header {
			flex-direction: column;
			align-items: stretch;
			gap: 16px;
			padding: 16px;
		}

		.header-title {
			text-align: center;
		}

		.title-text {
			font-size: 20px;
		}

		.title-subtitle {
			font-size: 12px;
		}

		.header-actions {
			flex-direction: column;
			gap: 10px;
		}

		.header-actions .uni-button {
			width: 100%;
			padding: 14px 20px;
		}
	}

	.uni-button {
		background-color: #ffffff !important;
		color: #42b983 !important;
		border: 2px solid #ffffff !important;
		border-radius: 6px;
		padding: 12px 24px;
		font-size: 14px;
		font-weight: 600;
		transition: all 0.25s ease;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	/* PC 端按钮优化 */
	@media screen and (min-width: 768px) {
		.uni-button {
			padding: 14px 28px;
			font-size: 15px;
			border-radius: 8px;
		}
	}

	@media screen and (min-width: 1200px) {
		.uni-button {
			padding: 16px 32px;
			font-size: 16px;
			border-radius: 10px;
		}
	}

	.uni-button:hover {
		background-color: #f0fdf7 !important;
		color: #359568 !important;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.uni-button:active {
		transform: translateY(0);
	}

	.uni-button.secondary {
		background-color: transparent !important;
		color: #ffffff !important;
		border: 2px solid #ffffff !important;
	}

	.uni-button.secondary:hover {
		background-color: rgba(255, 255, 255, 0.15) !important;
		color: #ffffff !important;
	}

	/* uni-list / uni-load-more 样式已移至无 scoped 块 */

	/* 错误提示 */
	.error-message {
		padding: 40px;
		text-align: center;
		background-color: #fef0f0;
		border: 1px solid #fde2e2;
		border-radius: 8px;
		color: #e74c3c;
		font-size: 14px;
	}

	/* 加载状态 */
	.loading-state {
		padding: 40px;
		text-align: center;
	}

	/* 空状态 */
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

	/* 已归档项目入口 */
	.archived-link {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		margin-top: 24px;
		padding: 12px;
		cursor: pointer;
		transition: all 0.25s ease;
	}

	.archived-link:hover {
		opacity: 0.8;
	}

	.archived-link-text {
		color: #adb5bd;
		font-size: 13px;
	}

	.archived-link:hover .archived-link-text {
		color: #6c757d;
	}
</style>

<!-- 无 scoped 样式块，用于覆盖子组件样式（兼容小程序） -->
<style lang="scss">
/* projects/list.vue - uni-list 样式 */
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
	border-color: #42b983;
	box-shadow: 0 4px 12px rgba(66, 185, 131, 0.15);
	transform: translateY(-2px);
}

.container .uni-list-item__container {
	padding: 16px 20px;
}

.container .uni-list-item__content-title {
	color: #2c3e50;
	font-weight: 500;
	font-size: 15px;
}

/* PC 端列表项优化 */
@media screen and (min-width: 768px) {
	.container .uni-list-item {
		margin-bottom: 14px;
		border-radius: 10px;
	}

	.container .uni-list-item__container {
		padding: 20px 24px;
	}

	.container .uni-list-item__content-title {
		font-size: 16px;
	}
}

@media screen and (min-width: 1200px) {
	.container .uni-list-item {
		margin-bottom: 16px;
		border-radius: 12px;
	}

	.container .uni-list-item__container {
		padding: 24px 28px;
	}

	.container .uni-list-item__content-title {
		font-size: 18px;
	}
}

.container .uni-list-item:hover .uni-list-item__content-title {
	color: #42b983;
}

.container .uni-list-item__extra-text {
	color: #6c757d;
	font-size: 13px;
}

.container .uni-list-item .uni-icons {
	color: #adb5bd;
	transition: all 0.25s ease;
}

.container .uni-list-item:hover .uni-icons {
	color: #42b983;
}

/* 加载状态 */
.container .uni-load-more {
	color: #42b983;
}
</style>