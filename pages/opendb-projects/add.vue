<!--
 * 新建项目页面
 *
 * 功能说明：
 * - 创建新项目，填写项目名称
 * - 创建者自动成为项目管理员
 * - 创建成功后返回项目列表
 *
 * 路由：/pages/opendb-projects/add
-->
<template>
	<view class="uni-container">
		<uni-forms ref="form" :value="formData" validate-trigger="submit" err-show-type="toast" label-width="90px">
			<uni-forms-item name="name" label="项目名称">
				<uni-easyinput v-model="formData.name" />
			</uni-forms-item>
<!-- 			<uni-forms-item name="members" label="项目成员">
				<uni-data-checkbox :multiple="true" v-model="formData.members" />
			</uni-forms-item> -->
			<view class="uni-button-group">
				<button type="primary" class="uni-button" @click="submit">提交</button>
			</view>
		</uni-forms>
	</view>
</template>

<script>
	import {
		validator
	} from '../../js_sdk/validator/opendb-projects.js';

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
		data() {
			return {
				formData: {
					"name": "",
					"members": []
				},
				formOptions: {},
				rules: {
					...getValidator(["name", "members"])
				}
			}
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
				// 使用 clientDB 提交数据
				console.log("submit:",value);
				db.action('add-project').collection(dbCollectionName).add(value).then((res) => {
					uni.showToast({
						icon: 'none',
						title: '新增成功'
					})
					this.getOpenerEventChannel().emit('refreshData')
					setTimeout(() => uni.navigateBack(), 500)
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

	/* 清除按钮hover效果 */
	:deep(.uni-easyinput__content-clear-icon:hover) {
		color: #359568 !important;
	}

	:deep(.uni-forms-item__label) {
		color: #2c3e50;
		font-weight: 500;
		font-size: 14px;
	}

	@media screen and (min-width: 768px) {
		:deep(.uni-forms-item__label) {
			font-size: 15px !important;
		}
	}

	@media screen and (min-width: 1200px) {
		:deep(.uni-forms-item__label) {
			font-size: 16px !important;
		}
	}
</style>
