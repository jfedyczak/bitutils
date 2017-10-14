const crypto = require('crypto')

let bitutils

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

const ALPHABET_MAP = {}
for (let i = 0; i < ALPHABET.length; i++) {
	ALPHABET_MAP[ALPHABET[i]] = i
}

module.exports = bitutils = {
	varInt: (buf) => {
		switch (buf[0]) {
			case 0xff: return [buf.readUIntLE(1, 8), 9]
			case 0xfe: return [buf.readUIntLE(1, 4), 5]
			case 0xfd: return [buf.readUIntLE(1, 2), 3]
			default: return [buf.readUIntLE(0, 1), 1]
		}
	},
	varIntSize: (i) => {
		if (i < 0xfd) {
			return 1
		} else if (i <= 0xffff) {
			return 3
		} else if (i <= 0xffffffff) {
			return 5
		} else {
			return 9
		}
	},
	writeVarInt: (buf, i, offset = 0) => {
		if (i < 0xfd) {
			buf[offset] = i
			return 1
		} else if (i <= 0xffff) {
			buf[offset] = 0xfd
			buf.writeIntLE(i, offset + 1, 2)
			return 3
		} else if (i <= 0xffffffff) {
			buf[offset] = 0xfe
			buf.writeIntLE(i, offset + 1, 4)
			return 5
		} else {
			buf[offset] = 0xff
			buf.writeIntLE(i, offset + 1, 8)
			return 9
		}
	},
	revBuf: (buf) => {
		const hex = '0123456789abcdef'
		let wyn = ''
		for (let i = buf.length - 1; i >= 0; i--) {
			wyn += hex[Math.floor(buf[i] / 16)] + hex[buf[i] % 16]
		}
		return wyn
	},
	writeRevBuf: (buf, rb, offset = 0) => {
		if (!Buffer.isBuffer(rb)) rb = Buffer.from(rb, 'hex')
		for (let i = 0; i < rb.length; i++)
			buf[offset + i] = rb[rb.length - i - 1]
	},
	bufToDec: (buf) => {
		let dec = []
		for (let i = buf.length * 2 - 1; i >=0; i--) {
			let carry = buf[Math.floor(i / 2)]
			if (i % 2)
				carry = (carry & 0xf0) >> 4
			else
				carry = carry & 0x0f
			dec = dec.map((d) => {
				let v = d * 16 + carry
				carry = Math.floor(v / 10)
				return v % 10
			})
			while (carry > 0) {
				dec.push(carry % 10)
				carry = Math.floor(carry / 10)
			}
		}
		let i, f
		[f, i] = [dec.slice(0, 8), dec.slice(8)]
		if (!i.length) i.push(0)
		while (f.length < 8) f.push(0)
		return `${i.reverse().join('')}.${f.reverse().join('')}`
	},
	doubleHash: (buf) => crypto
		.createHash('sha256')
		.update(crypto
			.createHash('sha256')
			.update(buf)
			.digest()
		)
		.digest(),
	base58: (source) => {
		const base = 58

		let digits = [0]
		for (let i = 0; i < source.length; ++i) {
			let carry = source[i]
			for (let j = 0; j < digits.length; ++j) {
				carry += digits[j] << 8
				digits[j] = carry % base
				carry = (carry / base) | 0
			}

			while (carry > 0) {
				digits.push(carry % base)
				carry = (carry / base) | 0
			}
		}
		let string = ''
		for (let k = 0; source[k] === 0 && k < source.length - 1; ++k) string += ALPHABET[0]
		for (let q = digits.length - 1; q >= 0; --q) string += ALPHABET[digits[q]]
		return string
	},
	base58decode: (source) => {
		let bytes, c, carry, i, j
		if (source.length === 0) {
			return Buffer.from('')
		}
		bytes = [0]
		i = 0
		while (i < source.length) {
			c = source[i];
			j = 0
			while (j < bytes.length) {
				bytes[j] *= 58;
				j++
			}
			bytes[0] += ALPHABET_MAP[c]
			carry = 0
			j = 0
			while (j < bytes.length) {
				bytes[j] += carry
				carry = bytes[j] >> 8
				bytes[j] &= 0xff
				j++
			}
			while (carry) {
				bytes.push(carry & 0xff)
				carry >>= 8
			}
			i++
		}
		i = 0
		while (source[i] === "1" && i < source.length - 1) {
			bytes.push(0)
			i++
		}
		return Buffer.from(bytes.reverse())
	},
	hash160toAddr: (h, p2sh = false) => {
		let addr = Buffer.allocUnsafe(25)
		h.copy(addr, 1, 0, 20)
		addr[0] = p2sh ? 0x05 : 0x00 // 0x05 for multisig address
		bitutils.doubleHash(addr.slice(0, 21))
			.copy(addr, 21, 0, 4)
		return bitutils.base58(addr)	
	},
	verifyAddr: (addr) => {
		try {
			addr = bitutils.base58decode(addr)
			if (addr.length !== 25) throw new Error('Bad address length')
			if (!addr.slice(21, 25).equals(bitutils.doubleHash(addr.slice(0, 21)).slice(0, 4)))
				throw new Error('Bad checksum')
			return true
		} catch (e) {
			return false
		}
	},
	pubkeytoAddr: (key) => bitutils.hash160toAddr(
		crypto.createHash('rmd160')
			.update(
				crypto.createHash('sha256')
					.update(key)
					.digest()
				).digest()
		)
}
