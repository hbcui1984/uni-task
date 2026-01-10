/**
 * add-project action
 *
 * 功能说明：
 * - 创建项目时自动将创建者添加为管理员
 * - 生成项目邀请码
 */
module.exports = {
	// 数据写入前触发
	before: async (state, event) => {
		// 确保用户已登录
		if (!state.auth || !state.auth.uid) {
			throw new Error('请先登录')
		}

		// 将创建者添加为管理员
		state.newData.managers = [state.auth.uid]
		state.newData.members = []

		// 生成6位随机邀请码
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
		let inviteCode = ''
		for (let i = 0; i < 6; i++) {
			inviteCode += chars.charAt(Math.floor(Math.random() * chars.length))
		}
		state.newData.invite_code = inviteCode

		// 设置邀请码7天有效期
		state.newData.invite_code_expires = Date.now() + 7 * 24 * 60 * 60 * 1000

		// 设置创建时间
		state.newData.create_time = Date.now()

		// 默认未归档
		state.newData.archived = false
	},

	// 数据写入后触发
	after: async (state, event, error, result) => {
		if (error) {
			throw error
		}
		// 可以在这里记录项目创建日志
		return result
	}
}
