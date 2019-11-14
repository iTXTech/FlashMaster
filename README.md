# iTXTech FlashMaster

Powerful NAND Flash Part Number and Id query toolbox.

## Introduction

The re-implementation of [FlashMaster](https://github.com/PeratX/FlashMaster) in [Vue.js](https://vuejs.org/) and [Vuetify](https://vuetifyjs.com/).

Focus to be fast, light-weight and portable.

Backend: [iTXTech FlashDetector](https://github.com/iTXTech/FlashDetector)

## Features

1. Material Design
1. Full ~~legacy~~ FlashMaster Features (without Embedded Server of course :)
   1. Decode Part Number
   1. Search Part Number in FlashDetector Flash Database
   1. Search Flash Id in FlashDetector Flash Database
1. No cookies will be stored

## Setup

```bash
git clone https://github.com/iTXTech/FlashMaster
cd FlashMaster
npm install
npm run serve
```

## Build and Deploy

```bash
npm run build
```

Upload all files in `dist`.

## License

    Copyright (C) 2019 iTX Technologies
    
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
    
        http://www.apache.org/licenses/LICENSE-2.0
    
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.