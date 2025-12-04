<!--
 * 个人中心页面
 *
 * 功能说明：
 * - 展示用户头像和昵称
 * - 提供快捷功能入口（我的任务、已完成、设置、关于）
 * - 提供功能菜单列表
 * - 显示版本更新提示
 * - 未登录时引导用户登录
 *
 * 路由：/pages/ucenter/ucenter
-->
<template>
	<view class="center">

		<!-- <uni-sign-in ref="signIn"></uni-sign-in> -->
		<view class="userInfo" @click.capture="toUserInfo">
			<cloud-image width="150rpx" height="150rpx" v-if="hasLogin&&userInfo.avatar_file&&userInfo.avatar_file.url" :src="userInfo.avatar_file.url"></cloud-image>
			
			<view v-else class="defaultAvatarUrl">
				<uni-icons color="#ffffff" size="50" type="person-filled" />
			</view>
			
			<view class="logo-title">
				<text class="uer-name" v-if="hasLogin">{{userInfo.nickname||userInfo.username||userInfo.mobile}}</text>
				<text class="uer-name" v-else>未登录</text>
			</view>
		</view>
		<uni-grid class="grid" :column="4" :showBorder="false" :square="true">
			<uni-grid-item class="item" v-for="(item,index) in gridList" @click.native="tapGrid(index)" :key="index">
				<uni-icons class="icon" color="#42b983" :type="item.icon" size="26"></uni-icons>
				<text class="text">{{item.text}}</text>
			</uni-grid-item>
		</uni-grid>
		<uni-list class="center-list" v-for="(sublist , index) in ucenterList" :key="index">
			<uni-list-item v-for="(item,i) in sublist" :title="item.title" link :rightText="item.rightText" :key="i"
				:clickable="true" :to="item.to" @click="ucenterListClick(item)" :show-extra-icon="true"
				:extraIcon="{type:item.icon,color:'#6c757d'}">
				<template v-slot:footer>
					<view v-if="item.showBadge" class="item-footer">
						<text class="item-footer-text">{{item.rightText}}</text>
						<view class="item-footer-badge"></view>
					</view>
				</template>
			</uni-list-item>
		</uni-list>
	</view>
</template>

<script>
	import checkUpdate from '@/uni_modules/uni-upgrade-center-app/utils/check-update';
	import callCheckVersion from '@/uni_modules/uni-upgrade-center-app/utils/call-check-version';
	// #ifdef APP
	import UniShare from '@/uni_modules/uni-share/js_sdk/uni-share.js';
	const uniShare = new UniShare()
	// #endif
	const db = uniCloud.database();
	import {
		store,
		mutations
	} from '@/uni_modules/uni-id-pages/common/store.js'
	export default {
		// #ifdef APP
		onBackPress({from}) {
			if(from=='backbutton'){
				this.$nextTick(function(){
					uniShare.hide()
				})
				return uniShare.isShow;
			}
		},
		// #endif
		data() {
			return {
				gridList: [{
						"text": "消息",
						"icon": "chat"
					},
					{
						"text": "上传",
						"icon": "cloud-upload"
					},
					{
						"text": "联系人",
						"icon": "contact"
					},
					{
						"text": "下载",
						"icon": "download"
					}
				],
				ucenterList: [
					[
						// #ifdef APP-PLUS
						{
							"title": "看广告签到",
							"event": 'signInByAd',
							"icon": "compose"
						},
						// #endif
						{
							"title": "签到",
							"event": 'signIn',
							"icon": "compose"
						},
						// #ifdef APP-PLUS
						{
							"title": "去评分",
							"event": 'gotoMarket',
							"icon": "star"
						},
						//#endif
						{
							"title": "阅读文章",
							"to": '/pages/ucenter/read-news-log/read-news-log',
							"icon": "flag"
						},
						{
							"title": "我的积分",
							"to": '',
							"event": 'getScore',
							"icon": "paperplane"
						},
						{
							"title": "任务动态",
							"to": '/pages/task-logs/task-logs',
							"icon": "notification"
						}
						// #ifdef APP-PLUS
						, {
							"title": "邀请好友",
							"event": 'share',
							"icon": "redo"
						}
						// #endif
					],
					[{
						"title": "意见反馈",
						"to": '/uni_modules/uni-feedback/pages/opendb-feedback/opendb-feedback',
						"icon": "help"
					}, {
						"title": "设置",
						"to": '/pages/ucenter/settings/settings',
						"icon": "gear"
					}],
					// #ifdef APP-PLUS
					[{
						"title": "关于",
						"to": '/pages/ucenter/about/about',
						"icon": "info"
					}]
					// #endif
				],
				listStyles: {
					"height": "150rpx", // 边框高度
					"width": "150rpx", // 边框宽度
					"border": { // 如果为 Boolean 值，可以控制边框显示与否
						"color": "#eee", // 边框颜色
						"width": "1px", // 边框宽度
						"style": "solid", // 边框样式
						"radius": "100%" // 边框圆角，支持百分比
					}
				}
			}
		},
		onLoad() {
			//#ifdef APP-PLUS
			this.ucenterList[this.ucenterList.length - 2].unshift({
				title: '检查更新',
				rightText: this.appVersion.version + '-' + this.appVersion.versionCode,
				event: 'checkVersion',
				icon: 'loop',
				showBadge: this.appVersion.hasNew
			})
			//#endif
		},
		onShow() {
		},
		computed: {
			userInfo() {
				return store.userInfo
			},
			hasLogin(){
				return store.hasLogin
			},
			// #ifdef APP-PLUS
			appVersion() {
				return getApp().appVersion
			},
			// #endif
			appConfig() {
				return getApp().globalData.config
			}
		},
		methods: {
			toSettings() {
				uni.navigateTo({
					url: "/pages/ucenter/settings/settings"
				})
			},
			signIn() { //普通签到
				this.$refs.signIn.open()
			},
			signInByAd(){ //看激励视频广告签到
				this.$refs.signIn.showRewardedVideoAd()
			},
			/**
			 * 个人中心项目列表点击事件
			 */
			ucenterListClick(item) {
				if (!item.to && item.event) {
					this[item.event]();
				}
			},
			async checkVersion() {
				let res = await callCheckVersion()
				console.log(res);
				if (res.result.code > 0) {
					checkUpdate()
				} else {
					uni.showToast({
						title: res.result.message,
						icon: 'none'
					});
				}
			},
			toUserInfo() {
				uni.navigateTo({
					url: '/uni_modules/uni-id-pages/pages/userinfo/userinfo'
				})
			},
			tapGrid(index) {
				uni.showToast({
					title: '你点击了第 ' + (index + 1) + ' 个',
					icon: 'none'
				});
			},
			/**
			 * 去应用市场评分
			 */
			gotoMarket() {
				// #ifdef APP-PLUS
				if (uni.getSystemInfoSync().platform == "ios") {
					// 这里填写appstore应用id
					let appstoreid = this.appConfig.marketId.ios; // 'id1417078253';
					console.log({appstoreid});
					plus.runtime.openURL("itms-apps://" + 'itunes.apple.com/cn/app/wechat/' + appstoreid + '?mt=8',err=>{
						console.log('plus.runtime.openURL err:' + JSON.stringify(err));
					});
				}
				if (uni.getSystemInfoSync().platform == "android") {
					var Uri = plus.android.importClass("android.net.Uri");
					var uri = Uri.parse("market://details?id=" + this.appConfig.marketId.android);
					var Intent = plus.android.importClass('android.content.Intent');
					var intent = new Intent(Intent.ACTION_VIEW, uri);
					var main = plus.android.runtimeMainActivity();
					main.startActivity(intent);
				}
				// #endif
			},
			/**
			 * 获取积分信息
			 */
			getScore() {
				if (!this.userInfo) return uni.showToast({
					title: '请先登录查看积分',
					icon: 'none'
				});
				uni.showLoading({
					mask: true
				})
				db.collection("uni-id-scores")
					.where('"user_id" == $env.uid')
					.field('score,balance')
					.orderBy("create_date", "desc")
					.limit(1)
					.get()
					.then((res) => {
						console.log(res);
						const data = res.result.data[0];
						let msg = '';
						msg = data ? ('当前积分：' + data.balance) : '暂无积分';
						uni.showToast({
							title: msg,
							icon: 'none'
						});
					}).finally(()=>{
						uni.hideLoading()
					})
			},
			async share() {
				let {result} = await db.collection('uni-id-users').where("'_id' == $cloudEnv_uid").field('my_invite_code').get()
				let myInviteCode = result.data[0].my_invite_code
				if(!myInviteCode){
					return uni.showToast({
						title: '请检查uni-config-center中uni-id配置，是否已启用 autoSetInviteCode',
						icon: 'none'
					});
				}
				console.log({myInviteCode});
				let {
					appName,
					logo,
					company,
					slogan
				} = this.appConfig.about
				// #ifdef APP-PLUS
				uniShare.show({
					content: {
						type: 0,
						href: this.appConfig.h5.url +
							`/#/pages/ucenter/invite/invite?code=uniInvitationCode:${myInviteCode}`,
						title: appName,
						summary: slogan,
						imageUrl: logo +
							'?x-oss-process=image/resize,m_fill,h_100,w_100'
					},
					menus: [{
							"img": "/static/app-plus/sharemenu/wechatfriend.png",
							"text": "微信好友",
							"share": {
								"provider": "weixin",
								"scene": "WXSceneSession"
							}
						},
						{
							"img": "/static/app-plus/sharemenu/wechatmoments.png",
							"text": "朋友圈",
							"share": {
								"provider": "weixin",
								"scene": "WXSceneTimeline"
							}
						},
						{
							"img": "/static/app-plus/sharemenu/weibo.png",
							"text": "微博",
							"share": {
								"provider": "sinaweibo"
							}
						},
						{
							"img": "/static/app-plus/sharemenu/qq.png",
							"text": "QQ",
							"share": {
								"provider": "qq"
							}
						},
						{
							"img": "/static/app-plus/sharemenu/copyurl.png",
							"text": "复制链接",
							"share": "copyurl"
						},
						{
							"img": "/static/app-plus/sharemenu/more.png",
							"text": "更多",
							"share": "shareSystem"
						}
					],
					cancelText: "取消分享",
				}, e => {
					console.log(e);
				})
				// #endif
			}
		}
	}
</script>

<style lang="scss" scoped>
	/* #ifndef APP-NVUE */
	view {
		display: flex;
		box-sizing: border-box;
		flex-direction: column;
	}

	page {
		background: linear-gradient(to bottom, #fafdfb, #f7f8fa);
	}
	/* #endif*/

	.center {
		flex: 1;
		flex-direction: column;
		background: linear-gradient(to bottom, #fafdfb, #f7f8fa);
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
	}

	.userInfo {
		padding-top: 60px;
		padding-bottom: 40px;
		background-image: linear-gradient(135deg, #42b983 0%, #359568 100%);
		flex-direction: column;
		align-items: center;
		position: relative;
		box-shadow: 0 4px 14px rgba(66, 185, 131, 0.2);
	}

	.defaultAvatarUrl {
		width: 150rpx;
		height: 150rpx;
		background-color: rgba(255, 255, 255, 0.2);
		border: 3px solid rgba(255, 255, 255, 0.5);
		border-radius: 100%;
		justify-content: center;
		align-items: center;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		transition: all 0.25s ease;
	}

	.defaultAvatarUrl:active {
		transform: scale(0.95);
	}

	.logo-title {
		flex: 1;
		align-items: center;
		justify-content: space-between;
		flex-direction: row;
	}

	.uer-name {
		height: 100rpx;
		line-height: 100rpx;
		font-size: 38rpx;
		color: #FFFFFF;
		font-weight: 600;
		letter-spacing: 1px;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	/* PC 端用户信息优化 */
	@media screen and (min-width: 768px) {
		.userInfo {
			padding-top: 80px;
			padding-bottom: 50px;
		}

		.defaultAvatarUrl {
			width: 180rpx;
			height: 180rpx;
		}

		.uer-name {
			font-size: 44rpx;
		}
	}

	@media screen and (min-width: 1200px) {
		.userInfo {
			padding-top: 100px;
			padding-bottom: 60px;
		}

		.defaultAvatarUrl {
			width: 200rpx;
			height: 200rpx;
		}

		.uer-name {
			font-size: 48rpx;
		}
	}

	.center-list {
		margin-bottom: 20rpx;
		background-color: transparent;
	}

	.center-list-cell {
		width: 750rpx;
		background-color: #42b983;
		height: 40rpx;
	}

	.grid {
		background-color: #FFFFFF;
		margin-bottom: 20rpx;
		border-radius: 12px;
		margin-left: 24rpx;
		margin-right: 24rpx;
		box-shadow: 0 2px 8px rgba(66, 185, 131, 0.08);
		overflow: hidden;
	}

	/* PC 端 grid 优化 */
	@media screen and (min-width: 768px) {
		.grid {
			margin-left: 48rpx;
			margin-right: 48rpx;
			margin-bottom: 28rpx;
			border-radius: 14px;
		}

		.uni-grid .text {
			font-size: 15px;
		}

		.center-list {
			margin-left: 48rpx;
			margin-right: 48rpx;
			margin-bottom: 28rpx;
			border-radius: 14px;
		}
	}

	@media screen and (min-width: 1200px) {
		.grid {
			margin-left: 64rpx;
			margin-right: 64rpx;
			margin-bottom: 32rpx;
			border-radius: 16px;
		}

		.uni-grid .text {
			font-size: 16px;
		}

		.uni-grid .item ::v-deep .uni-grid-item__box {
			padding: 32rpx 0;
		}

		.center-list {
			margin-left: 64rpx;
			margin-right: 64rpx;
			margin-bottom: 32rpx;
			border-radius: 16px;
		}
	}

	.uni-grid .text {
		font-size: 14px;
		height: 25px;
		line-height: 25px;
		color: #6c757d;
		font-weight: 500;
	}

	.uni-grid .item ::v-deep .uni-grid-item__box {
		justify-content: center;
		align-items: center;
		transition: all 0.25s ease;
		padding: 20rpx 0;
	}

	.uni-grid .item:active ::v-deep .uni-grid-item__box {
		background-color: #f0fdf7;
	}

	/* 图标颜色 */
	.icon {
		transition: all 0.25s ease;
	}

	.item:active .icon {
		color: #42b983 !important;
		transform: scale(1.1);
	}

	/* 列表样式优化 */
	.center-list {
		background-color: #FFFFFF;
		border-radius: 12px;
		margin-left: 24rpx;
		margin-right: 24rpx;
		box-shadow: 0 2px 8px rgba(66, 185, 131, 0.08);
		overflow: hidden;
	}

	/* 列表项样式 */
	.center-list ::v-deep .uni-list-item {
		transition: all 0.25s ease;
	}

	.center-list ::v-deep .uni-list-item:active {
		background-color: #f0fdf7;
	}

	.center-list ::v-deep .uni-list-item__icon {
		transition: all 0.25s ease;
	}

	.center-list ::v-deep .uni-list-item:active .uni-list-item__icon {
		color: #42b983 !important;
	}

	.center-list ::v-deep .uni-list-item__content-title {
		color: #2c3e50;
		font-weight: 500;
	}

	.center-list ::v-deep .uni-list-item:active .uni-list-item__content-title {
		color: #42b983;
	}

	/*修改边线粗细示例*/
	/* #ifndef APP-NVUE */
	.center-list ::v-deep .uni-list--border:after {
		-webkit-transform: scaleY(0.2);
		transform: scaleY(0.2);
		margin-left: 80rpx;
		background-color: #e9ecef;
	}

	.center-list ::v-deep .uni-list--border-top,
	.center-list ::v-deep .uni-list--border-bottom {
		display: none;
	}

	/* #endif */
	.item-footer {
		flex-direction: row;
		align-items: center;
	}

	.item-footer-text {
		color: #999;
		font-size: 24rpx;
		padding-right: 10rpx;
	}

	.item-footer-badge {
		width: 20rpx;
		height: 20rpx;
		/* #ifndef APP-NVUE */
		border-radius: 50%;
		/* #endif */
		/* #ifdef APP-NVUE */
		border-radius: 10rpx;
		/* #endif */
		background-color: #e74c3c;
		box-shadow: 0 2px 4px rgba(231, 76, 60, 0.3);
	}

	/* 头像图片样式 */
	::v-deep cloud-image {
		border-radius: 100%;
		border: 3px solid rgba(255, 255, 255, 0.5);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		overflow: hidden;
	}
</style>