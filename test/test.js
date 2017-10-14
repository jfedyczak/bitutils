const bitutils = require('./../src/bitutils.js')

const TESTS = [
	{
		name: 'varInt',
		test: () => {
			const cases = [
				['fc', [252, 1]],
				['fd0001', [256, 3]],
				['fe00000100', [65536, 5]],
				['feffffffff', [4294967295, 5]],
				['ff0000000000000001', [72057594037927940, 9]],
			]
			cases.forEach(c => {
				let res = bitutils.varInt(Buffer.from(c[0], 'hex'))
				if (res[0] !== c[1][0] || res[1] !== c[1][1])
					throw new Error(`Wrong results for case ${c[0]}`)
			})
		},
	},
	{
		name: 'varIntSize',
		test: () => {
			const cases = [
				[252, 1],
				[256, 3],
				[65536, 5],
				[4294967295, 5],
				[72057594037927940, 9],
			]
			cases.forEach(c => {
				let res = bitutils.varIntSize(c[0])
				if (res !== c[1])
					throw new Error(`Wrong results for case ${c[0]}`)
			})
		},
	},
	{
		name: 'writeVarInt',
		test: () => {
			const genBuf = () => Buffer.from('0102030405060708090a0b0c0d0e0f101112', 'hex')
			const cases = [
				[[genBuf(), 252, 3], '010203fc05060708090a0b0c0d0e0f101112'],
				[[genBuf(), 256, 4], '01020304fd000108090a0b0c0d0e0f101112'],
				[[genBuf(), 65536, 5], '0102030405fe000001000b0c0d0e0f101112'],
				// [[genBuf(), 4294967295, 6], ''],
				// [[genBuf(), 72057594037927940, 7], ''],
			]
			cases.forEach(c => {
				let buf = c[0][0]
				let res = bitutils.writeVarInt(buf, c[0][1], c[0][2])
				if (!buf.equals(Buffer.from(c[1], 'hex')))
					throw new Error(`Wrong results for case ${c[0][1]}`)
			})
		},
	},
	{
		name: 'revBuf',
		test: () => {
			const cases = [
				['05', '05'],
				['000102030405060708090a0b0c0d0e0f', '0f0e0d0c0b0a09080706050403020100'],
			]
			cases.forEach(c => {
				let res = bitutils.revBuf(Buffer.from(c[0], 'hex'))
				if (res !== c[1])
					throw new Error(`Wrong results for case ${c[0]}`)
			})
		},
	},
	{
		name: 'writeRevBuf',
		test: () => {
			const genBuf = () => Buffer.from('0102030405060708090a0b0c0d0e0f101112', 'hex')
			const cases = [
				[['05', 1], '0105030405060708090a0b0c0d0e0f101112'],
				[['000102030405060708090a0b0c0d0e0f', 2], '01020f0e0d0c0b0a09080706050403020100'],
			]
			cases.forEach(c => {
				let buf = genBuf()
				let res = bitutils.writeRevBuf(buf, c[0][0], c[0][1])
				if (!buf.equals(Buffer.from(c[1], 'hex')))
					throw new Error(`Wrong results for case ${c[0][0]}`)
			})
		},
	},
	{
		name: 'bufToDec',
		test: () => {
			const cases = [
				['05', '0.00000005'],
				['00e1f505', '1.00000000'],
				['00e1f505', '1.00000000'],
				['ff2010753a0b','123456.99999999'],
			]
			cases.forEach(c => {
				let res = bitutils.bufToDec(Buffer.from(c[0], 'hex'))
				if (res !== c[1])
					throw new Error(`Wrong results for case ${c[0]}`)
			})
		},
	},
	{
		name: 'doubleHash',
		test: () => {
			const cases = [
				[Buffer.from('bitutils'), '90a41f8661fdde7da36ef8002fb300419c7a6b45a4373aaebace32476c84a31b'],
				[Buffer.from('2a8b5bc585fbe8796d6e7de0966eeb9fc75ebb57980244682732bc540eeff0d8', 'hex'), '254d9526dd4cbacd13647b7e32ee419728107fbdee32b795377de564f6a39db6'],
			]
			cases.forEach(c => {
				let res = bitutils.doubleHash(c[0])
				if (!res.equals(Buffer.from(c[1], 'hex')))
					throw new Error(`Wrong results for case ${c[0]}`)
			})
		},
	},
	{
		name: 'base58',
		test: () => {
			const cases = [
				[Buffer.from('254d9526dd4cbacd13647b7e32ee419728107fbdee32b795377de564f6a39db6', 'hex'), '3WchZPaTs3kjMxktoJsKiEnpBLRurqjc9cWcyC6hy9GH'],
				[Buffer.from('2a8b5bc585fbe8796d6e7de0966eeb9fc75ebb57980244682732bc540eeff0d8', 'hex'), '3s5NccNiHasp34L6JPXfuCRUgb9uwH91rwJqc22PiGW3'],
			]
			cases.forEach(c => {
				let res = bitutils.base58(c[0])
				if (res !== c[1])
					throw new Error(`Wrong results for case ${c[0]}`)
			})
		},
	},
	{
		name: 'base58decode',
		test: () => {
			const cases = [
				[Buffer.from('254d9526dd4cbacd13647b7e32ee419728107fbdee32b795377de564f6a39db6', 'hex'), '3WchZPaTs3kjMxktoJsKiEnpBLRurqjc9cWcyC6hy9GH'],
				[Buffer.from('2a8b5bc585fbe8796d6e7de0966eeb9fc75ebb57980244682732bc540eeff0d8', 'hex'), '3s5NccNiHasp34L6JPXfuCRUgb9uwH91rwJqc22PiGW3'],
			]
			cases.forEach(c => {
				let res = bitutils.base58decode(c[1])
				if (!res.equals(c[0]))
					throw new Error(`Wrong results for case ${c[1]}`)
			})
		},
	},
	{
		name: 'hash160toAddr',
		test: () => {
			const cases = [
				[[Buffer.from('d2860b4acda9d89cabe20879de2c3834ed45cf95', 'hex'), false], '1LC9UqHKvTm26sjCZRfow5tZECAz5KSu7B'],
				[[Buffer.from('ab65b961abdcd0d7d98c649eaa840ffe268a5f13', 'hex'), false], '1GdGQio9sF8EhYFevSPM6Lckw4V9J5bFpU'],
				[[Buffer.from('302ed06858fc5a4f4aa1fa72222cd3972fdc4f6b', 'hex'), true], '365nST9zR4AkUF4bjd249q59C4WNgaByNF'],
			]
			cases.forEach(c => {
				let res = bitutils.hash160toAddr(c[0][0], c[0][1])
				if (res !== c[1])
					throw new Error(`Wrong results for case ${c[0]}`)
			})
		},
	},
	{
		name: 'verifyAddr',
		test: () => {
			const cases = [
				['16UwLL9Risc3QfPqBUvKofHmBQ7wMtjvM', true],
				['1LC9UqHKvTm26sjCZRfow5tZECAz5KSu7B', true],
				['1GdGQio9sF8EhYFevSPM6Lckw4V9J5bFpU', true],
				['365nST9zR4AkUF4bjd249q59C4WNgaByNF', true],
				['16UwL9Risc3QfPqBUvKofHmBQ7wMtjvM', false],
				['1LC9UkHKvTm26sjCZRfow5tZECAz5KSu7B', false],
				['1GdGQio9sF8EhYFevSPM6Lckw4V7J5bFpU', false],
				['465nST9zR4AkUF4bjd249q59C4WNgaByNF', false],
			]
			cases.forEach(c => {
				let res = bitutils.verifyAddr(c[0])
				if (res !== c[1])
					throw new Error(`Wrong results for case ${c[0]}`)
			})
		},
	},
	{
		name: 'pubkeytoAddr',
		test: () => {
			const cases = [
				[Buffer.from('0450863AD64A87AE8A2FE83C1AF1A8403CB53F53E486D8511DAD8A04887E5B23522CD470243453A299FA9E77237716103ABC11A1DF38855ED6F2EE187E9C582BA6', 'hex'), '16UwLL9Risc3QfPqBUvKofHmBQ7wMtjvM'],
			]
			cases.forEach(c => {
				let res = bitutils.pubkeytoAddr(c[0])
				if (res !== c[1])
					throw new Error(`Wrong results for case ${c[0]}`)
			})
		},
	},
]

TESTS.forEach((t, i) => {
	console.log(` -- [${i + 1}/${TESTS.length}] testing ${t.name}`)
	t.test()
})
console.log(` -- all tests passed`)