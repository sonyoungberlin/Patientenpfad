/** @type {import('next').NextConfig} */
const nextConfig = {
	async headers() {
		return [
			{
				source: "/questionnaire-kiosk/:path*",
				headers: [
					{ key: "Cache-Control", value: "no-store" },
					{ key: "Referrer-Policy", value: "no-referrer" },
				],
			},
			{
				source: "/q/:path*",
				headers: [
					{ key: "Cache-Control", value: "no-store" },
					{ key: "Referrer-Policy", value: "no-referrer" },
				],
			},
			{
				source: "/account/set-password",
				headers: [
					{ key: "Cache-Control", value: "no-store" },
					{ key: "Referrer-Policy", value: "no-referrer" },
				],
			},
			{
				source: "/account/forgot-password",
				headers: [
					{ key: "Cache-Control", value: "no-store" },
					{ key: "Referrer-Policy", value: "no-referrer" },
				],
			},
		];
	},
};

module.exports = nextConfig;
