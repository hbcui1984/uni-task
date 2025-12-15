<!--
 * 编辑任务页面
 *
 * 功能说明：
 * - 编辑任务基本信息（标题、描述）
 * - 由 schema2code 生成的基础页面
 * - 注：大部分任务编辑功能已集成到任务详情页
 *
 * 路由：/pages/opendb-task/edit?id={taskId}&pid={projectId}
-->
<template>
	<view class="uni-container" style="max-width: 1200px;margin: 15px auto;">
		<uni-forms ref="form" :value="formData" validate-trigger="submit" err-show-type="toast" label-width="75px">
			<uni-forms-item name="title" label="标题">
				<uni-easyinput placeholder="任务标题" v-model="formData.title" trim="both" />
			</uni-forms-item>
			<uni-forms-item name="content" label="任务详情">
				<textarea placeholder="这里可输入详细描述" @input="binddata('content', $event.detail.value)"
					class="uni-textarea-border" :value="formData.content" trim="right"></textarea>
			</uni-forms-item>

			<view class="uni-button-group">
				<button type="primary" class="uni-button" @click="submit">提交</button>
				<button class="uni-button" @click="back">返回</button>
			</view>
		</uni-forms>
	</view>
</template>

<script>
	import {
		validator
	} from '@/js_sdk/validator/opendb-task.js';

	const db = uniCloud.database();
	const dbCollectionName = 'opendb-task';

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
		data() {
			return {
				formData: {
					"title": "",
					"content": "",
					// "assignee": ""
				},
				formOptions: {},
				rules: {
					...getValidator(["title", "content", "assignee"])
				}
			}
		},
		onLoad(e) {
			const id = e.id
			this.formDataId = id
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

			submitForm(value) {
				// 使用 uni-clientDB 提交数据
				db.collection(dbCollectionName).doc(this.formDataId).update(value).then((res) => {
					uni.showToast({
						icon: 'success',
						title: '修改成功'
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
								// 如果返回失败，使用 history.back
								history.back()
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
			
			back() {
				uni.navigateBack()
			},
			
			
			/**
			 * 获取表单数据
			 * @param {Object} id
			 */
			getDetail(id) {
				uni.showLoading({
					mask: true
				})
				db.collection(dbCollectionName).doc(id).field('title,content,assignee').get().then((res) => {
					const data = res.result.data[0]
					if (data) {
						this.formData = data
					}
				}).catch((err) => {
					uni.showModal({
						content: err.message || '请求服务失败',
						showCancel: false
					})
				}).finally(() => {
					uni.hideLoading()
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

	.uni-container {
		max-width: 480px;
		margin: 20px auto;
		background-color: #ffffff;
		border-radius: 12px;
		box-shadow: 0 4px 14px rgba(66, 185, 131, 0.1);
		padding: 24px 20px;
	}

	/* PC 端优化 */
	@media screen and (min-width: 768px) {
		.uni-container {
			max-width: 680px;
			margin: 32px auto;
			padding: 32px 40px;
			border-radius: 16px;
		}
	}

	@media screen and (min-width: 1200px) {
		.uni-container {
			max-width: 800px;
			margin: 40px auto;
			padding: 40px 56px;
			border-radius: 18px;
		}
	}

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
		padding: 10px;
		height: 80px;
	}

	.uni-button-group {
		margin-top: 50px;
		display: flex;
		justify-content: center;
		gap: 16px;
	}

	@media screen and (min-width: 768px) {
		.uni-button-group {
			margin-top: 56px;
		}
	}

	.uni-button {
		width: 200px;
		padding: 14px 24px;
		font-size: 15px;
		font-weight: 500;
		border-radius: 6px;
		line-height: 1;
		margin: 0;
		transition: all 0.25s ease;
	}

	@media screen and (min-width: 768px) {
		.uni-button {
			width: 220px;
			padding: 16px 28px;
			font-size: 16px;
			border-radius: 8px;
		}
	}

	@media screen and (min-width: 1200px) {
		.uni-button {
			width: 240px;
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

	:deep(.uni-easyinput__content-clear-icon:hover) {
		color: #359568 !important;
	}
</style>
