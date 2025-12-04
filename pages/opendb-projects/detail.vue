<!--
 * 项目详情页面
 *
 * 功能说明：
 * - 展示项目基本信息（名称、成员等）
 * - 提供修改项目、查看动态、删除项目等操作入口
 * - 由 schema2code 生成的基础页面
 *
 * 路由：/pages/opendb-projects/detail?id={projectId}
-->
<template>
	<view class="container">
		<unicloud-db ref="udb" v-slot:default="{data, loading, error, options}" :options="options"
			collection="opendb-projects" field="name,members" :where="queryWhere" :getone="true" :manual="true">
			<view v-if="error">{{error.message}}</view>
			<view v-else-if="loading">
				<uni-load-more :contentText="loadMore" status="loading"></uni-load-more>
			</view>
			<view v-else-if="data">
				<view>
					<text>项目名称:</text>
					<text>{{data.name}}</text>
				</view>

				<view>
					<text>项目成员:</text>
					<text>{{data.members}}</text>
				</view>
			</view>
		</unicloud-db>
		<view class="btns">
			<button type="primary" @click="handleUpdate">修改</button>
			<button type="default" class="btn-logs" @click="handleViewLogs">项目动态</button>
			<button type="warn" class="btn-delete" @click="handleDelete">删除</button>
		</view>
	</view>
</template>

<script>
	// 由schema2code生成，包含校验规则和enum静态数据
	import {
		enumConverter
	} from '../../js_sdk/validator/opendb-projects.js';

	export default {
		data() {
			return {
				queryWhere: '',
				loadMore: {
					contentdown: '',
					contentrefresh: '',
					contentnomore: ''
				},
				options: {
					// 将scheme enum 属性静态数据中的value转成text
					...enumConverter
				}
			}
		},
		onLoad(e) {
			this._id = e.id
		},
		onReady() {
			if (this._id) {
				this.queryWhere = '_id=="' + this._id + '"'
			}
		},
		methods: {
			handleUpdate() {
				// 打开修改页面
				uni.navigateTo({
					url: '../opendb-projects/edit?id=' + this._id,
					events: {
						// 监听修改页面成功修改数据后, 刷新当前页面数据
						refreshData: () => {
							this.$refs.udb.loadData({
								clear: true
							})
						}
					}
				})
			},
			handleDelete() {
				this.$refs.udb.remove(this._id, {
					success: (res) => {
						// 删除数据成功后跳转到list页面
						uni.navigateTo({
							url: '../opendb-projects/list'
						})
					}
				})
			},

			// 查看项目动态
			handleViewLogs() {
				// 跳转到任务动态页面，并传入项目ID作为筛选条件
				uni.navigateTo({
					url: '../task-logs/task-logs?project_id=' + this._id
				})
			}
		}
	}
</script>

<style>
	page {
		background: linear-gradient(to bottom, #fafdfb, #f7f8fa);
		min-height: 100vh;
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 24px;
	}

	@media screen and (min-width: 768px) {
		.container {
			padding: 32px 48px;
		}
	}

	@media screen and (min-width: 1200px) {
		.container {
			padding: 40px 64px;
		}
	}

	.btns {
		margin-top: 24px;
		display: flex;
		flex-direction: row;
		gap: 12px;
	}

	@media screen and (min-width: 768px) {
		.btns {
			margin-top: 32px;
			gap: 16px;
		}
	}

	.btns button {
		flex: 1;
		padding: 12px 20px;
		font-size: 15px;
		font-weight: 500;
		border-radius: 6px;
		transition: all 0.25s ease;
	}

	@media screen and (min-width: 768px) {
		.btns button {
			padding: 14px 24px;
			font-size: 16px;
			border-radius: 8px;
		}
	}

	@media screen and (min-width: 1200px) {
		.btns button {
			padding: 16px 28px;
			font-size: 17px;
			border-radius: 10px;
		}
	}

	.btn-logs {
		margin-left: 0;
	}

	.btn-delete {
		margin-left: 0;
	}

	/* 绿色主题按钮 */
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

	/* 默认按钮优化 */
	:deep(button[type="default"]) {
		background-color: #ffffff !important;
		color: #42b983 !important;
		border: 1px solid #42b983 !important;
	}

	:deep(button[type="default"]:hover) {
		background-color: #f0fdf7 !important;
		border-color: #359568 !important;
		color: #359568 !important;
	}

	/* 警告按钮优化 */
	:deep(button[type="warn"]) {
		background-color: #e74c3c !important;
		border-color: #e74c3c !important;
	}

	:deep(button[type="warn"]:hover) {
		background-color: #c0392b !important;
		box-shadow: 0 4px 14px rgba(231, 76, 60, 0.3);
		transform: translateY(-2px);
	}
</style>