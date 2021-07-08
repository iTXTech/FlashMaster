# iTXTech FlashMaster

[![Donate](https://img.shields.io/badge/alipay-donate-yellow.svg)](https://qr.alipay.com/FKX04751EZDP0SQ0BOT137)

Powerful NAND Flash Part Number and Id query toolbox.

# [Launch Now - 立即使用](https://flashm.cf)

## Introduction

The re-implementation of [FlashMaster](https://github.com/PeratX/FlashMaster) in [Vue.js](https://vuejs.org/) and [Vuetify](https://vuetifyjs.com/).

Focus to be fast, light-weight and portable.

Backend: [iTXTech FlashDetector](https://github.com/iTXTech/FlashDetector)

## Features

1. Material Design
1. Full ~~legacy~~ [FlashMaster](https://github.com/PeratX/FlashMaster) Features (without Embedded Server of course :)
   1. Decode Part Number
   1. Fetch summary for Part Number
   1. Search Part Number in FlashDetector Flash Database
   1. Search Flash Id in FlashDetector Flash Database
1. Use localStorage for persistence storage 

## Setup

```bash
git clone https://github.com/iTXTech/FlashMaster
cd FlashMaster
yarn
yarn serve
```

## Build and Deploy

```bash
yarn build
```

Upload all files in `dist`.

## Apps

* [FlashMasterAndroid](https://github.com/iTXTech/FlashMasterAndroid) - iTXTech FlashMaster App for Android 4.4+ 
* [FlashMasteriOS](https://github.com/iTXTech/FlashMasteriOS) - iTXTech FlashMaster App for iOS 9.0+ and iPadOS 13.0+

## License

    Copyright (C) 2019-2021 iTX Technologies
    
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
