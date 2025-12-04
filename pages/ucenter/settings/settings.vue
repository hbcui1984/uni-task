<!--
 * 设置页面
 *
 * 功能说明：
 * - 个人信息修改入口
 * - 修改密码（需绑定手机号）
 * - APP端：清除缓存、推送服务开关
 * - 生物识别：指纹/面容识别
 * - 登录/退出登录
 *
 * 路由：/pages/ucenter/settings/settings
-->
<template>
	<view class="content">
		<!-- 功能列表 -->
		<uni-list class="mt10" :border="false">
			<uni-list-item title="个人信息" to="/uni_modules/uni-id-pages/pages/userinfo/userinfo" link="navigateTo"></uni-list-item>
			<uni-list-item v-if="userInfo.mobile" title="修改密码" :to="'/pages/ucenter/login-page/pwd-retrieve/pwd-retrieve?phoneNumber='+ userInfo.mobile" link="navigateTo"></uni-list-item>
		</uni-list>
		<uni-list class="mt10" :border="false">
		<!-- #ifndef H5 -->
			<!-- #ifdef APP-PLUS -->
			<!-- 检查push过程未结束不显示，push设置项 -->
			<uni-list-item title="清除缓存" @click="clearTmp" link></uni-list-item>
			<uni-list-item v-show="pushIsOn != 'wait'" title="推送服务" @click.native="pushIsOn?pushServer.off():pushServer.on()"  showSwitch :switchChecked="pushIsOn"></uni-list-item>
			<!-- #endif -->
			<uni-list-item v-if="supportMode.includes('fingerPrint')" title="指纹识别" @click.native="startSoterAuthentication('fingerPrint')" link></uni-list-item>
			<uni-list-item v-if="supportMode.includes('facial')" title="面容识别" @click="startSoterAuthentication('facial')" link></uni-list-item>
		<!-- #endif -->
		</uni-list>

		<!-- 退出/登录 按钮 -->
		<view class="bottom-back" @click="changeLoginState">
			<text class="bottom-back-text" v-if="hasLogin">退出登录</text>
			<text class="bottom-back-text" v-else>登录</text>
		</view>
	</view>
</template>

<script>
	import pushServer from './dc-push/push.js';
	import {
		store,
		mutations
	} from '@/uni_modules/uni-id-pages/common/store.js'
	export default {
		data() {
			return {
				pushServer:pushServer,
				supportMode:[],
				pushIsOn:"wait",
				userInfo:{}
			}
		},
		computed: {
			hasLogin(){
				return store.hasLogin
			}
		},
		onLoad() {
			uni.setNavigationBarTitle({
				title: '设置'
			})
			// #ifdef APP-PLUS || MP-WEIXIN
			uni.checkIsSupportSoterAuthentication({
				success: (res) => {
					this.supportMode = res.supportMode
				},
				fail: (err) => {
					console.log(err);
				}
			})
			// #endif
		},
		onShow() {
			// 检查手机端获取推送是否开启
			//#ifdef APP-PLUS
			setTimeout(()=>{
				this.pushIsOn = pushServer.isOn();
			},300)
			//#endif
		},
		methods: {
			async changeLoginState(){
				if(this.hasLogin){
					await mutations.logout()
				}else{
					uni.redirectTo({
						url: '/uni_modules/uni-id-pages/pages/login/login-withoutpwd',
					});
				}
			},
			/**
			 * 开始生物认证
			 */
			startSoterAuthentication(checkAuthMode) {
				console.log(checkAuthMode);
				let title = {"fingerPrint": "指纹识别", "facial": "面容识别"}[checkAuthMode]
				// 检查是否开启认证
				this.checkIsSoterEnrolledInDevice({checkAuthMode,title})
					.then(() => {
						console.log(checkAuthMode,title);
						// 开始认证
						uni.startSoterAuthentication({
							requestAuthModes: [checkAuthMode],
							challenge: '123456',
							authContent: `请进行${title}`,
							complete: (res) => {
								console.log(res);
							},
							success: (res) => {
								console.log(res);
								if (res.errCode == 0) {
									return uni.showToast({
										title: `${title}验证成功`,
										icon: 'none'
									});
								}
								uni.showToast({
									title: '验证失败，请重试',
									icon: 'none'
								});
							},
							fail: (err) => {
								console.log(err);
								console.log(`认证失败:${err.errCode}`);
								uni.showToast({
									title: '认证失败',
									icon: 'none'
								});
							}
						})
					})
			},
			checkIsSoterEnrolledInDevice({checkAuthMode,title}) {
				return new Promise((resolve, reject) => {
					uni.checkIsSoterEnrolledInDevice({
						checkAuthMode,
						success: (res) => {
							console.log(res);
							if (res.isEnrolled) {
								return resolve(res);
							}
							uni.showToast({
								title: `设备未开启${title}`,
								icon: 'none'
							});
							reject(res);
						},
						fail: (err) => {
							console.log(err);
							uni.showToast({
								title: `${title}不可用`,
								icon: 'none'
							});
							reject(err);
						}
					})
				})
			},
			clearTmp() {
				uni.showLoading({
					title: '清理中...',
					mask: true
				});
				uni.getSavedFileList({
					success:res=>{
						if (res.fileList.length > 0) {
							uni.removeSavedFile({
								filePath: res.fileList[0].filePath,
								complete:res=>{
									console.log(res);
									uni.hideLoading()
									uni.showToast({
										title: '清理完成',
										icon: 'none'
									});
								}
							});
						}else{
							uni.hideLoading()
							uni.showToast({
								title: '清理完成',
								icon: 'none'
							});
						}
					},
					complete:e=>{
						console.log(e);
					}
				});
			}
		}
	}
</script>

<style>
	/* #ifndef APP-NVUE */
	page {
		flex: 1;
		width: 100%;
		height: 100%;
	}

	uni-button:after {
		border: none;
		border-radius: 0;
	}
	/* #endif */
	.content {
		/* #ifndef APP-NVUE */
		display: flex;
		width: 750rpx;
		height: 100vh;
		/* #endif */
		flex-direction: column;
		flex: 1;
		background-color: #F9F9F9;
	}

	.bottom-back {
		margin-top: 10px;
		width: 750rpx;
		height: 44px;
		/* #ifndef APP-NVUE */
		display: flex;
		/* #endif */
		flex-direction: column;
		justify-content: center;
		align-items: center;
		/* #ifndef APP-NVUE */
		border: none;
		/* #endif */
		border-width: 0;
		border-radius: 0;
		background-color: #FFFFFF;
	}

	.bottom-back-text {
		font-size: 33rpx;
	}

	.mt10 {
		margin-top: 10px;
	}
	/* #ifndef APP-NVUE  || VUE3 */
	.content ::v-deep .uni-list {
		background-color: #F9F9F9;
	}
	.content ::v-deep .uni-list-item--disabled,.list-item {
		height: 50px;
		margin-bottom: 1px;
	}
	/* #endif */

</style>
