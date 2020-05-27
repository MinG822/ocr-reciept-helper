class ocrRecieptHelper {
  constructor(resJson, placeName, sumKeywords=['총금액', '총액', '합계'], dateKeywords=['발행일', '날짜', '거래일자'], skipWords=['청구서', '세부내역', '수량', '금액']) {
    this.sumKeywords = sumKeywords
    this.dateKeywords = dateKeywords
    this.skipWords = skipWords
    this.placeName = placeName.replace(/\n/g, '').replace(/\s+/g, '')
    
    this.parts = resJson.textAnnotations.map(this.getParts)
    this.full = this.parts.shift()
    this.sortedParts = this.parts.sort((a, b) => (Object.values(b)[0][0].y - Object.values(a)[0][0].y) || (Object.values(b)[0].x - Object.values(a)[0].x))

    this.rows = this.getRows()
    this.whitespace = this.calcSpace()
    this.table = this.rows.map(row => this.divideRow(row))
    this.isPlaceName = this.checkPlaceName()
    this.dateInfo = this.getDateInfo()
    this.filterSkipwords()
    this.priceTable = this.divideCol()
  }

  getRows() {
    const rows = []
    const pLen = this.sortedParts.length
    let checkBox = new Array(pLen).fill(0)
    let m, c, thres, flag, j;

    do {
      [m, c, thres, j] = this.getHyperParams(checkBox)
      const row = []
      for (let i = 0; i < pLen; i++) {
        if (checkBox[i] !== 1) {
          if (this.isRow(this.sortedParts[i], m, c, thres)) {
            checkBox[i] = 1
            row.push(i)
          }
        }
      }
      const orderedRow = this.reorder(row)
      rows.push(orderedRow)
      checkBox = this.checkOutliers(checkBox)
      flag = (j !== (pLen - 1))
    } while (flag & this.sum(checkBox) < (pLen - 1))
    return rows
  }

  getHyperParams(checkBox) {
    const j = this.getStandard(checkBox)
    const tempPoly = Object.values(this.sortedParts[j])[0]
    const v = [tempPoly[0].x, tempPoly[1].x, tempPoly[0].y, tempPoly[1].y] // x1, x2, y1, y2
    const m = (v[2] - v[3]) / (v[0] - v[1])
    const c = - (m * v[0]) + v[2]
    const thres = Math.abs(v[2] - tempPoly[2].y) / 2
    return [ m, c, thres, j ]
  }

  getStandard(checkBox) {
    if (this.sum(checkBox) === 0) {
      const ski = this.sortedParts.findIndex(key => (this.sumKeywords.includes(Object.keys(key)[0])))
      if (ski !== -1) {
        return ski
      }
    }
    const i = checkBox.findIndex(p => p === 0)
    return i
  }

  reorder(parts) {
    parts.sort((a, b) => (Object.values(this.sortedParts[a])[0][0].x - Object.values(this.sortedParts[b])[0][0].x))
    return parts
  }

  checkOutliers(checkBox) {
    const i = checkBox.findIndex(b => b === 1)
    for (let j = 0; j < i; j++) {
      if (checkBox[j] === 0) {
        checkBox[j] = 1
      }
    }
    return checkBox
  }

  sum(array) {
    return array.reduce((acc, curr) => acc + curr)
  }

  getParts(r) {
    const temp = new Object()
    const tempPoly = r.boundingPoly.vertices.sort((a, b) => (b.y - a.y) || (b.x - a.x))
    temp[r.description] = tempPoly
    return temp
  }

  isRow(p, m, c, thres) {
    const underCenter = [(Object.values(p)[0][0].x + Object.values(p)[0][1].x) / 2, (Object.values(p)[0][0].y + Object.values(p)[0][1].y) / 2]
    const dist = Math.abs(m * underCenter[0] - underCenter[1] + c) / Math.sqrt(m * m + 1)
    if (dist < thres) {
      return true
    } else {
      return false
    }
  }

  calcSpace() {
    const allwords = this.sortedParts.map(p => Object.keys(p)[0])
    const totalwidth = this.sortedParts.map(
      p => (
        Math.sqrt(
          (Object.values(p)[0][0].x - Object.values(p)[0][1].x) ** 2 +
          (Object.values(p)[0][0].y - Object.values(p)[0][1].y) ** 2
        )
      ))
    return Math.ceil(this.sum(totalwidth) / allwords.join('').length) * 3
  }

  divideRow(row) {
    let words = row.map(r => Object.keys(this.sortedParts[r])[0])
    const newRow = []
    let tr = words[words.length - 1]
    for (let i = row.length - 1; i > 0; i--) {
      const r_dist =
        Math.sqrt(
          (Object.values(this.sortedParts[row[i]])[0][1].x - Object.values(this.sortedParts[row[i - 1]])[0][0].x) ** 2 +
          (Object.values(this.sortedParts[row[i]])[0][1].y - Object.values(this.sortedParts[row[i - 1]])[0][0].y) ** 2
        )
      if (r_dist < this.whitespace) {
        tr = Object.keys(this.sortedParts[row[i - 1]])[0] + tr
      } else {
        newRow.unshift(tr)
        tr = Object.keys(this.sortedParts[row[i - 1]])[0]
      }
    }
    newRow.unshift(tr)
    return newRow
  }

  getDateInfo() {
    const datei = []
    const dateInfo = []
    for (let i = 0; i < this.table.length; i++) {
      const temp = this.table[i].join('')
      if (this.findDate(temp)) {
        datei.push(i)
        dateInfo.push(temp)
      } else {
        for (let j = 0; j < this.dateKeywords.length; j++) {
          if (temp.includes(this.dateKeywords[j])) {
            datei.push(i)
            dateInfo.push(temp)
          }
        }
      }
    }
    this.table = this.table.filter((t, i) => !datei.includes(i))
    return dateInfo
  }

  findDate(s) {
    const dateTime = /\d{4}-\d{1,2}-\d{1,2}/;
    const match = dateTime.exec(s)
    return match
  }

  checkPlaceName() {
    return Object.keys(this.full).join('').replace(/\n/g, '').replace(/\s+/g, '').includes(this.placeName)
  }

  filterSkipwords() {
    const si = []
    const ei = []

    for (let i = 0; i < this.table.length; i++) {
      const temp = this.table[i].join('')
      for (let j = 0; j < this.skipWords.length; j++) {
        if (temp.includes(this.skipWords[j])) {
          si.push(i)
        }
      }
    }

    const s = Math.min(...si)
    for (let i = 0; i < this.table.length; i++) {
      const temp = this.table[i].join('')
      for (let j = 0; j < this.sumKeywords.length; j++) {
        if (temp.includes(this.sumKeywords[j])) {
          ei.push(i)
        }
      }
    }
    const e = Math.max(...ei)
    this.table = this.table.slice(e + 1, s)
  }

  findPrice(s) {
    const price = /\d{3}/;
    const match = price.exec(s)
    return match
  }
  isNum(s) {
    const nums = /\d{1,2}/
    return nums.test(s)
  }

  divideCol() {
    const priceTable = []
    let temp = ''
    for (let i = this.table.length - 1; i > -1; i--) {
      const row = []
      let rLen = this.table[i].length
      if (this.table[i][rLen - 1] === '원') {
        this.table[i].pop()
        rLen -= 1
      }
      let priceCandi = this.table[i][rLen - 1]
      const numCandi = this.table[i][rLen - 2]
      const full = this.table[i].join('')
      let detail
      if (this.findPrice(priceCandi)) {
        priceCandi = priceCandi[priceCandi.length - 1] === '원' ? priceCandi.slice(0, priceCandi.length - 1) : priceCandi
        row.unshift(priceCandi)
        if (this.isNum(numCandi)) {
          row.unshift(numCandi)
          if (rLen > 2) {
            detail = this.table[i].splice(0, rLen - 2).join('')
          } else {
            detail = row.unshift('')
          }
        } else {
          row.unshift('1')
          detail = this.table[i].splice(0, rLen - 1).join('')
        }
        if (temp !== '') {
          row.unshift(temp.concat(detail))
          temp = ''
        } else {
          row.unshift(detail)
        }
        priceTable.push(row)
      } else {
        temp = full
      }
    }
    return priceTable
  }
}

module.exports = ocrRecieptHelper