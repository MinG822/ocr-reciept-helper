![npm](https://img.shields.io/npm/v/@ming822/ocr-reciept-helper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/@ming822/ocr-reciept-helper)


# Ocr Reciept Helper
Ocr Reciept Helper is a javascript library for extracting all the pairs of an item and a price of a reciept object from google ocr api response.
Notice
- Specialized in the forms of reciepts in Korea
- Using Linear equation when detect a line of an item and a price 
  - Work well with Rotated or sligtly curved reciepts
  - Poor work with curved or folded reciepts

## Installation
Use npm to install ocr reciept helper.
```bash
npm install @ming822/ocr-reciept-helper
```

## Usage

- `response.json` below is a response from your [google ocr api request] (https://cloud.google.com/vision/docs/ocr?)
- parameters when declare new instance
  - `resJson` : required. the object of google api response. It must have textAnnotations.
  - `placeName` : the name of the place of receipt.
  - `sumKeywords`
    - the words which refer sum.
    - they play a role of startline to detect lines of reciepts.
    - recommend to use common words at the bottom parts of receipt as it detects from bottom to top.
  - `dateKeywords` : the words which refer date.
  - `skipwords` : all the unnecessary words
- variables of an instance
  - `whitespace`
    - the minimum distance of phrase
    - an average width of all the character * 2
    - return value of `calcSpace` method
  - `dateInfo`
    - lines which contains dateKeywords.
    - also check lines of yyyy-mm-dd or yyyy-m-d through `findDate` in `getDateInfo`
  - `priceTable`
    - all the pairs of an item and a price of reciepts
    - pairs which are expected to be below the skipwords and above the sumKeywords are extracted through `filterSkipwords`

```javascript
const recieptHelper = require('@ming822/ocr-reciept-helper')

const res = fs.readFileSync('response.json', {encoding:'utf-8', flag:'r'})
const resJson = JSON.parse(res)
const reciept = new recieptHelper(resJson)
console.log(reciept.priceTable)
```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](https://choosealicense.com/licenses/mit/)

