const ref = process.env.GITHUB_REF;
const branch = ref.split('/').pop();

function getPlugins() {
	if (branch === 'master') {
		return [
			'@semantic-release/commit-analyzer',
			'@semantic-release/release-notes-generator',
			['@semantic-release/changelog', { changelogFile: 'CHANGELOG.md' }],
			['@semantic-release/npm'],
			['@semantic-release/git', {
				assets: ['CHANGELOG.md', 'package.json', 'package-lock.json'],
				message: '${nextRelease.version} CHANGELOG [skip ci]\n\n${nextRelease.notes}',
			}],
			'@semantic-release/github',
		];
	}

	return [
		'@semantic-release/commit-analyzer',
		'@semantic-release/release-notes-generator',
		['@semantic-release/npm'],
		['@semantic-release/git', {
			assets: ['package.json'],
			message: '${nextRelease.version} CHANGELOG [skip ci]\n\n${nextRelease.notes}',
		}],
		'@semantic-release/github',
	];
}

module.exports = {
	branches: [
		'master',
		{ name: 'dev', prerelease: true, },
	],
	plugins: getPlugins(),
}
