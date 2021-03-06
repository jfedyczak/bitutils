const bitutils = require(`${__dirname}/../src/bitutils.js`)

expect.extend({
	toBeBuffer(received, buffer) {
		if (buffer.equals(received)) {
			return {
				message: () => 'Buffers equal',
				pass: true,
			}
		} else {
			return {
				message: () => 'Buffers not equal',
				pass: false,
			}
		}
	},
	toBeBufferHex(received, buffer) {
		if (bfx(buffer).equals(received)) {
			return {
				message: () => 'Buffers equal',
				pass: true,
			}
		} else {
			return {
				message: () => 'Buffers not equal',
				pass: false,
			}
		}
	},
})

let bfx = (hex) => Buffer.from(hex, 'hex')

test('varInt', () => {
	const cases = [
		['fc', [252, 1]],
		['fd0001', [256, 3]],
		['fd0302', [515, 3]],
		['fe00000100', [65536, 5]],
		['feffffffff', [4294967295, 5]],
		['ff0000000000000001', [72057594037927940, 9]],
		['ff0200000000000001', [72057594037927942, 9]],
	]
	cases.forEach(c => {
		expect(bitutils.varInt(bfx(c[0]))).toEqual(c[1])
	})	
})

test('varIntSize', () => {
	const cases = [
		[252, 1],
		[256, 3],
		[65536, 5],
		[4294967295, 5],
		[72057594037927940, 9],
	]
	cases.forEach(c => {
		expect(bitutils.varIntSize(c[0])).toBe(c[1])
	})	
})

test('writeVarInt', () => {
	const genBuf = () => bfx('0102030405060708090a0b0c0d0e0f101112')
	const cases = [
		[[genBuf(), 252, 3], '010203fc05060708090a0b0c0d0e0f101112'],
		[[genBuf(), 256, 4], '01020304fd000108090a0b0c0d0e0f101112'],
		[[genBuf(), 65536, 5], '0102030405fe000001000b0c0d0e0f101112'],
		// [[genBuf(), 4294967295, 6], ''],
		// [[genBuf(), 72057594037927940, 7], ''],
	]
	cases.forEach(c => {
		let buf = c[0][0]
		bitutils.writeVarInt(buf, c[0][1], c[0][2])
		expect(buf).toBeBufferHex(c[1])
	})
})

test('revBuf', () => {
	const cases = [
		['05', '05'],
		['000102030405060708090a0b0c0d0e0f', '0f0e0d0c0b0a09080706050403020100'],
	]
	cases.forEach(c => {
		expect(bitutils.revBuf(bfx(c[0]))).toBe(c[1])
	})
})

test('writeRevBuf', () => {
	const genBuf = () => bfx('0102030405060708090a0b0c0d0e0f101112')
	const cases = [
		[['05', 1], '0105030405060708090a0b0c0d0e0f101112'],
		[['000102030405060708090a0b0c0d0e0f', 2], '01020f0e0d0c0b0a09080706050403020100'],
	]
	cases.forEach(c => {
		let buf = genBuf()
		bitutils.writeRevBuf(buf, c[0][0], c[0][1])
		expect(buf).toBeBufferHex(c[1])
	})
})

test('bufToDec', () => {
	const cases = [
		['05', '0.00000005'],
		['00e1f505', '1.00000000'],
		['00e1f505', '1.00000000'],
		['ff2010753a0b','123456.99999999'],
	]
	cases.forEach(c => {
		expect(bitutils.bufToDec(bfx(c[0]))).toBe(c[1])
	})
})

test('doubleHash', () => {
	const cases = [
		[Buffer.from('bitutils'), '90a41f8661fdde7da36ef8002fb300419c7a6b45a4373aaebace32476c84a31b'],
		[bfx('2a8b5bc585fbe8796d6e7de0966eeb9fc75ebb57980244682732bc540eeff0d8'), '254d9526dd4cbacd13647b7e32ee419728107fbdee32b795377de564f6a39db6'],
	]
	cases.forEach(c => {
		expect(bitutils.doubleHash(c[0])).toBeBufferHex(c[1])
	})
})

test('base58', () => {
	const cases = [
		[bfx('254d9526dd4cbacd13647b7e32ee419728107fbdee32b795377de564f6a39db6'), '3WchZPaTs3kjMxktoJsKiEnpBLRurqjc9cWcyC6hy9GH'],
		[bfx('2a8b5bc585fbe8796d6e7de0966eeb9fc75ebb57980244682732bc540eeff0d8'), '3s5NccNiHasp34L6JPXfuCRUgb9uwH91rwJqc22PiGW3'],
	]
	cases.forEach(c => {
		expect(bitutils.base58(c[0])).toBe(c[1])
	})
})

test('base58decode', () => {
	const cases = [
		[bfx('254d9526dd4cbacd13647b7e32ee419728107fbdee32b795377de564f6a39db6'), '3WchZPaTs3kjMxktoJsKiEnpBLRurqjc9cWcyC6hy9GH'],
		[bfx('2a8b5bc585fbe8796d6e7de0966eeb9fc75ebb57980244682732bc540eeff0d8'), '3s5NccNiHasp34L6JPXfuCRUgb9uwH91rwJqc22PiGW3'],
	]
	cases.forEach(c => {
		expect(bitutils.base58decode(c[1])).toBeBufferHex(c[0])
	})
})

test('hash160toAddr', () => {
	const cases = [
		[[bfx('d2860b4acda9d89cabe20879de2c3834ed45cf95'), false], '1LC9UqHKvTm26sjCZRfow5tZECAz5KSu7B'],
		[[bfx('ab65b961abdcd0d7d98c649eaa840ffe268a5f13'), false], '1GdGQio9sF8EhYFevSPM6Lckw4V9J5bFpU'],
		[[bfx('302ed06858fc5a4f4aa1fa72222cd3972fdc4f6b'), true], '365nST9zR4AkUF4bjd249q59C4WNgaByNF'],
	]
	cases.forEach(c => {
		expect(bitutils.hash160toAddr(c[0][0], c[0][1])).toBe(c[1])
	})
})

test('encodeBech32', () => {
	const cases = [
		[bfx('751e76e8199196d454941c45d1b3a323f1433bd6'), 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'],
		[bfx('1863143c14c5166804bd19203356da136c985678cd4d27a1b8c6329604903262'), 'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3'],
	]
	cases.forEach(c => {
		expect(bitutils.encodeBech32(c[0])).toBe(c[1])
	})
})

test('decodeBech32', () => {
	const cases = [
		[bfx('751e76e8199196d454941c45d1b3a323f1433bd6'), 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'],
		[bfx('1863143c14c5166804bd19203356da136c985678cd4d27a1b8c6329604903262'), 'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3'],
	]
	cases.forEach(c => {
		expect(bitutils.decodeBech32(c[1])).toBeBuffer(c[0])
	})
})

test('verifyAddr', () => {
	const cases = [
		['16UwLL9Risc3QfPqBUvKofHmBQ7wMtjvM', true],
		['1LC9UqHKvTm26sjCZRfow5tZECAz5KSu7B', true],
		['1GdGQio9sF8EhYFevSPM6Lckw4V9J5bFpU', true],
		['365nST9zR4AkUF4bjd249q59C4WNgaByNF', true],
		['16UwL9Risc3QfPqBUvKofHmBQ7wMtjvM', false],
		['1LC9UkHKvTm26sjCZRfow5tZECAz5KSu7B', false],
		['1GdGQio9sF8EhYFevSPM6Lckw4V7J5bFpU', false],
		['465nST9zR4AkUF4bjd249q59C4WNgaByNF', false],
		['bc1qdl753ur9ucwa3cgfrud2nqvu7k69dykk3cwwx6g64a5szn3xw92sp8mc7a', true],
		['bc1qdm753ur9ucwa3cgfrud2nqvu7k69dykk3cwwx6g64a5szn3xw92sp8mc7a', false],
		['bc1qwqdg6squsna38e46795at95yu9atm8azzmyvckulcc7kytlcckxswvvzej', true],
		['bd1qwqdg6squsna38e46795at95yu9atm8azzmyvckulcc7kytlcckxswvvzej', false],
	]
	cases.forEach(c => {
		expect(bitutils.verifyAddr(c[0])).toBe(c[1])
	})
})

test('pubkeytoAddr', () => {
	const cases = [
		[bfx('0450863AD64A87AE8A2FE83C1AF1A8403CB53F53E486D8511DAD8A04887E5B23522CD470243453A299FA9E77237716103ABC11A1DF38855ED6F2EE187E9C582BA6'), '16UwLL9Risc3QfPqBUvKofHmBQ7wMtjvM'],
	]
	cases.forEach(c => {
		expect(bitutils.pubkeytoAddr(c[0])).toBe(c[1])
	})
})

test('privKeyToPubKey', () => {
	const cases = [
		[[bfx('a887add550944120474acff40ef24b2289e7013ec4e00a64c40337d4a0de6f2a'), true], bfx('024cd78a6ae4fb23dd29defe8b44daca05be5bfe4642dc9380064ed80c9ed148c2')],
		[[bfx('8bdd0ab7866759482b8f16065c7010506d362ced443f5709278f3d44f55302b2'), true], bfx('0262b518253e11799cc405776073b0dc3acbb2d2721368d6f8e57935394ed5ddf9')],
		[[bfx('e22d02ecbef915d43853737dc4b725fb4a3de819b5d6c97b9e4fef13128cf311'), false], bfx('04b3135c78da3eb3efa36a6798b4de048d45dd3c8243ba0402157391e6af047b2707687fd5901e299c3872a559c6f9bcb3c063a0b947d11cfc28f6e15bb477a23c')],
		[[bfx('15a763e608b18a7e490060f3c1c29dcc44b7f3d99d6a96ea0549c0908c03a3a0'), false], bfx('040630eaa581d021a3b560b7ed6eea256229dbd8e1956be2026b1f62b85833ec5e9ae4ebd6bdcfcc3b60fb40883b3e76ac5a0360599e175773194cd63b8c9b2fde')],
	]
	cases.forEach(c => {
		expect(bitutils.privKeyToPubKey(c[0][0], c[0][1])).toBeBuffer(c[1])
	})
})

test('privKeyToAddr', () => {
	const cases = [
		[[bfx('a887add550944120474acff40ef24b2289e7013ec4e00a64c40337d4a0de6f2a'), true], '1MS4TJfe79ZfFpBqQxiRd7Rt3xBLJ1MaQU'],
		[[bfx('8bdd0ab7866759482b8f16065c7010506d362ced443f5709278f3d44f55302b2'), true], '18TNjyxQM9qJX3t8PEaRtVzrgd3yqMxy84'],
		[[bfx('e22d02ecbef915d43853737dc4b725fb4a3de819b5d6c97b9e4fef13128cf311'), false], '1JUrzi9bWcNKPDL2Yx9pf1bvUJtfeZ7HWs'],
		[[bfx('15a763e608b18a7e490060f3c1c29dcc44b7f3d99d6a96ea0549c0908c03a3a0'), false], '1EMoPVh3QqD39R2MRbxSK2bQdohmuGqm1Q'],
	]
	cases.forEach(c => {
		expect(bitutils.privKeyToAddr(c[0][0], c[0][1])).toBe(c[1])
	})
	
	let test_privKeyToAddr = (key) => () => bitutils.privKeyToAddr(key)
	expect(test_privKeyToAddr(bfx('0000000000000000000000000000000000000000000000000000000000000000'))).toThrow('Invalid private key')
	expect(test_privKeyToAddr(bfx('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'))).toThrow('Invalid private key')
})

test('privKeyToWIF', () => {
	const cases = [
		[[bfx('4d1a4c08598e18d8eeb0e54af2d588939d7b30487a404e60f6396b8adf6f6549'), true], 'Kyob5xqGyHWmXiUNoEEAVpP9EaKT1kGnNF2zru3Jodd1fMHnK5WQ'],
		[[bfx('bf0d2d278acc0feaa23098bab1a6113355e28df761d906bc867908f5d4a4bb2d'), true], 'L3d6AveeUWMRnjt53NySWr35JaEK33atDbbhUzdNWZVCeEANX6EC'],
		[[bfx('7c992c6ae771e163eba55eae5427487f4c5bd8f9f87f53f991042e93b4bd63b8'), false], '5JmAH7sq1KfLp1DX2LA9Qe2JYbheVoPH3FHSjtb5CvtJ7B79tLC'],
		[[bfx('0b5d6afda13d5ae9b7f58b174316a0aed6ef6d7dd8187f2e80955f3a2682c9a5'), false], '5HuHtAbSQxR6Rqs8c8MLUMnyjS8jH6HhhSc1FQGWbnaJQ8CJgqj'],
	]
	cases.forEach(c => {
		expect(bitutils.privKeyToWIF(c[0][0], c[0][1])).toBe(c[1])
	})
	
	let test_privKeyToWIF = (key) => () => bitutils.privKeyToWIF(key)
	expect(test_privKeyToWIF(bfx('0000000000000000000000000000000000000000000000000000000000000000'))).toThrow('Invalid private key')
	expect(test_privKeyToWIF(bfx('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'))).toThrow('Invalid private key')
})

test('WIFToPrivKey', () => {
	const cases = [
		[[bfx('4d1a4c08598e18d8eeb0e54af2d588939d7b30487a404e60f6396b8adf6f6549'), true], 'Kyob5xqGyHWmXiUNoEEAVpP9EaKT1kGnNF2zru3Jodd1fMHnK5WQ'],
		[[bfx('bf0d2d278acc0feaa23098bab1a6113355e28df761d906bc867908f5d4a4bb2d'), true], 'L3d6AveeUWMRnjt53NySWr35JaEK33atDbbhUzdNWZVCeEANX6EC'],
		[[bfx('7c992c6ae771e163eba55eae5427487f4c5bd8f9f87f53f991042e93b4bd63b8'), false], '5JmAH7sq1KfLp1DX2LA9Qe2JYbheVoPH3FHSjtb5CvtJ7B79tLC'],
		[[bfx('0b5d6afda13d5ae9b7f58b174316a0aed6ef6d7dd8187f2e80955f3a2682c9a5'), false], '5HuHtAbSQxR6Rqs8c8MLUMnyjS8jH6HhhSc1FQGWbnaJQ8CJgqj'],
	]
	cases.forEach(c => {
		let res = bitutils.WIFToPrivKey(c[1])
		expect(res.key).toBeBuffer(c[0][0])
		expect(res.compressed).toBe(c[0][1])
	})
})

test('WIFToAddr', () => {
	const cases = [
		['L33suxqWGcWDanbtNCpDH87jAGuaSFB8XwiERHkRNGRScz1AJt8L', '1AoJKXHhQjBNY2vTppwsdLGVMi4FNmCXPF'],
		['L5nnfrsS28mXynFqN6nSxnLztvxNM9VGu4DdLNQzx4mzuATs4DcU', '1C8CLprSpHEtJmcF2vcDy9GNEnuk22n2T3'],
		['5K32Nw2BkNE1xVJYmwpsXQH9A1hKGnEPVbu8B6cpJJZ9HoVxGDe', '1C9YvgKHCqYtxMWRWpDqzccspgMYxcdFpJ'],
		['5K8v22VzPfsjVmqDH5Lpz1BX9NZ8nofSFbgCByRTsP74Cpo6vDe', '1MkkwrcYi2SD8zxFZKE7NEUSEHopo4RKQr'],
	]
	cases.forEach(c => {
		expect(bitutils.WIFToAddr(c[0])).toBe(c[1])
	})	
})

test('generateWallet', () => {
	const cases = [
		[
			['fef0ceaf13e367bcd715dc092e2aa9d7f9972414907e875566c1fe23274fed21', false],
			{
				addr: "1BnPVV5Tt25cxbDg6DqoxJunjSL8reCGz6",
				wif: "L5mHKZsCLS27nSoGM3RdAwuxjvg7XhJdP25LgqdXe6zF11wpWdbT",
			}
		],
		[
			['0278d28795c6af1809b05339877680b951ede6e5a98371096997732de614505f', false],
			{
				addr: "1FCTUNKbbeXjmsycRaKJYh4zfeJDcXWXdm",
				wif: "KwJWtFq9MMov4G64T3NgJMH2U8gx53EHxm1zVs1kf7WeAoUmLx4c",
			}
		],
		[
			['fef0ceaf13e367bcd715dc092e2aa9d7f9972414907e875566c1fe23274fed21', true],
			{
				addr: "33voQqbNAYyig272KjcX8GkucWn2x25WEg",
				wif: "L5mHKZsCLS27nSoGM3RdAwuxjvg7XhJdP25LgqdXe6zF11wpWdbT",
			}
		],
		[
			['0278d28795c6af1809b05339877680b951ede6e5a98371096997732de614505f', true],
			{
				addr: "3EZoGRKkZXQj3r8tedjUFaMpb48D4khPr5",
				wif: "KwJWtFq9MMov4G64T3NgJMH2U8gx53EHxm1zVs1kf7WeAoUmLx4c",
			}
		],
	]
	cases.forEach(c => {
		expect(bitutils.generateWallet(bfx(c[0][0]), c[0][1])).toEqual(c[1])
	})	
})
