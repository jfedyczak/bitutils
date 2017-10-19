const crypto = require('crypto')
const EC = require('elliptic').ec

let bitutils

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

const ALPHABET_MAP = {}
for (let i = 0; i < ALPHABET.length; i++) {
	ALPHABET_MAP[ALPHABET[i]] = i
}

const ecparams = new EC('secp256k1')

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
		} else { // doesn't really work due to JS limitations
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
		for (let i = buf.length * 2 - 1; i >= 0; i--) {
			let c = buf[Math.floor(i / 2)]
			if (i % 2)
				c = (c & 0xf0) >> 4
			else
				c = c & 0x0f
			dec = dec.map((d) => {
				let v = d * 16 + c
				c = Math.floor(v / 10)
				return v % 10
			})
			while (c > 0) {
				dec.push(c % 10)
				c = Math.floor(c / 10)
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
	base58: (src) => {
		let d, c, j, s, k, q

		d = [0]
		for (i = 0; i < src.length; ++i) {
			c = src[i]
			for (j = 0; j < d.length; ++j) {
				c += d[j] << 8
				d[j] = c % 58
				c = (c / 58) | 0
			}

			while (c > 0) {
				d.push(c % 58)
				c = (c / 58) | 0
			}
		}
		s = ''
		for (k = 0; src[k] === 0 && k < src.length - 1; ++k) s += ALPHABET[0]
		for (q = d.length - 1; q >= 0; --q) s += ALPHABET[d[q]]
		return s
	},
	base58decode: (src) => {
		let b, c, cr, i, j

		if (src.length === 0) {
			return Buffer.from('')
		}
		b = [0]
		i = 0
		while (i < src.length) {
			c = src[i];
			j = 0
			while (j < b.length) {
				b[j] *= 58;
				j++
			}
			b[0] += ALPHABET_MAP[c]
			cr = 0
			j = 0
			while (j < b.length) {
				b[j] += cr
				cr = b[j] >> 8
				b[j] &= 0xff
				j++
			}
			while (cr) {
				b.push(cr & 0xff)
				cr >>= 8
			}
			i++
		}
		i = 0
		while (src[i] === "1" && i < src.length - 1) {
			b.push(0)
			i++
		}
		return Buffer.from(b.reverse())
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
		),
	validatePrivateKey: (privKey) => {
		privKey = privKey.toString('hex')
		return privKey > '0000000000000000000000000000000000000000000000000000000000000000' && privKey < 'fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141'
	},
	privKeyToAddr: (privKey, compressed = true) => {
		if (!bitutils.validatePrivateKey(privKey)) throw new Error('Invalid private key')

		let key = ecparams.keyFromPrivate(privKey)
		key = Buffer.from(key.getPublic(compressed, 'hex'), 'hex')
		return bitutils.pubkeytoAddr(key)		
	},
	privKeyToWIF: (privKey, compressed = true) => {
		if (!bitutils.validatePrivateKey(privKey)) throw new Error('Invalid private key')

		let addr = Buffer.concat([Buffer.from([0x80]), privKey])
		if (compressed) addr = Buffer.concat([addr, Buffer.from([0x01])])

		addr = Buffer.concat([addr, bitutils.doubleHash(addr).slice(0, 4)])
		return bitutils.base58(addr)
	},
	WIFToPrivKey: (wif) => {
		let key = bitutils.base58decode(wif)
		if (key.length !== 37 && key.length !== 38)
			throw new Error('Invalid key length')
		if (key[0] !== 0x80)
			throw new Error('Invalid net code')
		if (!bitutils.doubleHash(key.slice(0, -4)).slice(0, 4).equals(key.slice(-4)))
			throw new Error('Invalid checksum')
		let compressed
		if (key.length === 38) {
			compressed = true
			key = key.slice(1, -5)
		} else {
			compressed = false
			key = key.slice(1, -4)
		}
		if (!bitutils.validatePrivateKey(key)) throw new Error('Invalid private key')
		return {
			key: key,
			compressed: compressed,
		}
	},
	WIFToAddr: (wif) => {
		let key = bitutils.WIFToPrivKey(wif)
		return bitutils.privKeyToAddr(key.key, key.compressed)
	},
}
