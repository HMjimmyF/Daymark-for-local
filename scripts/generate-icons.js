const fs = require('node:fs')
const path = require('node:path')
const zlib = require('node:zlib')

const root = path.resolve(__dirname, '..')
const resources = path.join(root, 'resources')

const VARIANTS = {
    light: {
        backgroundStart: [255, 246, 231],
        backgroundEnd: [255, 231, 194],
        sunStart: [255, 178, 88],
        sunEnd: [255, 159, 67],
        back: [251, 227, 181],
        middle: [244, 211, 163],
        front: [133, 157, 182],
        crest: [205, 216, 226]
    },
    dark: {
        backgroundStart: [37, 49, 66],
        backgroundEnd: [23, 32, 45],
        sunStart: [255, 181, 90],
        sunEnd: [248, 149, 58],
        back: [88, 74, 66],
        middle: [60, 54, 54],
        front: [44, 64, 84],
        crest: [113, 134, 155]
    },
    mono: {
        backgroundStart: [247, 247, 248],
        backgroundEnd: [247, 247, 248],
        sunStart: [31, 41, 55],
        sunEnd: [31, 41, 55],
        back: [31, 41, 55],
        middle: [31, 41, 55],
        front: [247, 247, 248],
        crest: [247, 247, 248]
    },
    small: {
        backgroundStart: [255, 159, 67],
        backgroundEnd: [255, 159, 67],
        sunStart: [255, 247, 233],
        sunEnd: [255, 247, 233],
        back: [255, 247, 233],
        middle: [255, 231, 194],
        front: [255, 247, 233],
        crest: [255, 255, 255]
    }
}

function clamp(value, minimum = 0, maximum = 1) {
    return Math.min(maximum, Math.max(minimum, value))
}

function mix(start, end, amount) {
    return start.map((value, index) => Math.round(value + (end[index] - value) * amount))
}

function insideRoundedTile(x, y) {
    const inset = 0.03125
    const radius = 0.219
    const minimum = inset
    const maximum = 1 - inset
    if (x < minimum || x > maximum || y < minimum || y > maximum) {
        return false
    }
    const centerX = clamp(x, minimum + radius, maximum - radius)
    const centerY = clamp(y, minimum + radius, maximum - radius)
    return (x - centerX) ** 2 + (y - centerY) ** 2 <= radius ** 2
}

function sampleColor(x, y, variantName) {
    if (!insideRoundedTile(x, y)) {
        return [0, 0, 0, 0]
    }

    const variant = VARIANTS[variantName]
    const progress = clamp(x * 0.25 + y * 0.75)
    let color = mix(variant.backgroundStart, variant.backgroundEnd, progress)

    const sunDistance = Math.hypot(x - 0.5, y - 0.375)
    const sunRadius = variantName === 'small' ? 0.205 : 0.184
    if (sunDistance <= sunRadius) {
        color = mix(variant.sunStart, variant.sunEnd, clamp((y - 0.19) / 0.37))
    }

    if (variantName === 'small') {
        const horizon = 0.58 - 0.018 * Math.cos((x - 0.5) * Math.PI * 1.15)
        if (y >= horizon) {
            color = y < 0.65 - 0.015 * Math.cos((x - 0.5) * Math.PI) ? variant.back : variant.front
        }
        return [...color, 255]
    }

    const curve = clamp((x - 0.08) / 0.84)
    const backHill = 0.61 - 0.065 * Math.sin(curve * Math.PI)
    const middleHill = 0.7 - 0.035 * Math.sin(curve * Math.PI * 1.15)
    const frontHill = 0.82 - 0.17 * curve + 0.025 * Math.sin(curve * Math.PI * 1.4)

    if (y >= backHill) {
        color = variant.back
    }
    if (y >= middleHill) {
        color = variant.middle
    }
    if (y >= frontHill) {
        color = y - frontHill < 0.014 ? variant.crest : variant.front
    }

    return [...color, 255]
}

function crc32(buffer) {
    let crc = 0xffffffff
    for (const byte of buffer) {
        crc ^= byte
        for (let bit = 0; bit < 8; bit += 1) {
            crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
        }
    }
    return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
    const typeBuffer = Buffer.from(type)
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const checksum = Buffer.alloc(4)
    checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])))
    return Buffer.concat([length, typeBuffer, data, checksum])
}

function renderPixels(size, variantName) {
    const samples = size <= 48 ? 4 : 2
    const stride = size * 4 + 1
    const raw = Buffer.alloc(stride * size)

    for (let y = 0; y < size; y += 1) {
        raw[y * stride] = 0
        for (let x = 0; x < size; x += 1) {
            let red = 0
            let green = 0
            let blue = 0
            let alpha = 0
            for (let sampleY = 0; sampleY < samples; sampleY += 1) {
                for (let sampleX = 0; sampleX < samples; sampleX += 1) {
                    const pointX = (x + (sampleX + 0.5) / samples) / size
                    const pointY = (y + (sampleY + 0.5) / samples) / size
                    const color = sampleColor(pointX, pointY, variantName)
                    red += color[0]
                    green += color[1]
                    blue += color[2]
                    alpha += color[3]
                }
            }
            const sampleCount = samples * samples
            const offset = y * stride + 1 + x * 4
            raw[offset] = Math.round(red / sampleCount)
            raw[offset + 1] = Math.round(green / sampleCount)
            raw[offset + 2] = Math.round(blue / sampleCount)
            raw[offset + 3] = Math.round(alpha / sampleCount)
        }
    }
    return raw
}

function createPng(size, variantName) {
    const raw = renderPixels(size, variantName)
    const header = Buffer.alloc(13)
    header.writeUInt32BE(size, 0)
    header.writeUInt32BE(size, 4)
    header[8] = 8
    header[9] = 6
    return Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        chunk('IHDR', header),
        chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
        chunk('IEND', Buffer.alloc(0))
    ])
}

function createIco(variantName, sizes = [16, 24, 32, 48, 64, 128, 256]) {
    const images = sizes.map((size) => ({ size, png: createPng(size, variantName) }))
    const directorySize = 6 + images.length * 16
    const header = Buffer.alloc(directorySize)
    header.writeUInt16LE(0, 0)
    header.writeUInt16LE(1, 2)
    header.writeUInt16LE(images.length, 4)

    let offset = directorySize
    images.forEach((image, index) => {
        const entry = 6 + index * 16
        header[entry] = image.size >= 256 ? 0 : image.size
        header[entry + 1] = image.size >= 256 ? 0 : image.size
        header[entry + 2] = 0
        header[entry + 3] = 0
        header.writeUInt16LE(1, entry + 4)
        header.writeUInt16LE(32, entry + 6)
        header.writeUInt32LE(image.png.length, entry + 8)
        header.writeUInt32LE(offset, entry + 12)
        offset += image.png.length
    })

    return Buffer.concat([header, ...images.map((image) => image.png)])
}

fs.mkdirSync(resources, { recursive: true })
fs.writeFileSync(path.join(resources, 'app-icon.png'), createPng(256, 'light'))
fs.writeFileSync(path.join(resources, 'app-icon-dark.png'), createPng(256, 'dark'))
fs.writeFileSync(path.join(resources, 'app-icon-mono.png'), createPng(256, 'mono'))
fs.writeFileSync(path.join(resources, 'app-icon-small.png'), createPng(256, 'small'))
fs.writeFileSync(path.join(resources, 'tray-icon.png'), createPng(32, 'small'))
fs.writeFileSync(path.join(resources, 'app-icon.ico'), createIco('light'))

console.log('Generated Daymark brand icons and multi-resolution Windows ICO.')
