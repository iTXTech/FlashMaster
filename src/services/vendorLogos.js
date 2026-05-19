import biwin from '@/assets/biwin.svg';
import cxmt from '@/assets/cxmt.svg';
import elpida from '@/assets/elpida.svg';
import esmt from '@/assets/esmt.png';
import etron from '@/assets/etron.svg';
import gigadevice from '@/assets/gigadevice.svg';
import issi from '@/assets/issi.png';
import kingston from '@/assets/kingston.svg';
import kioxia from '@/assets/kioxia.svg';
import longsys from '@/assets/longsys.png';
import micron from '@/assets/micron.svg';
import nanya from '@/assets/nanya.png';
import phison from '@/assets/phison.svg';
import sandisk from '@/assets/sandisk.svg';
import samsung from '@/assets/samsung.svg';
import siliconmotion from '@/assets/siliconmotion.svg';
import skhynix from '@/assets/skhynix.svg';
import solidigm from '@/assets/solidigm.png';
import spectek from '@/assets/spectek.gif';
import winbond from '@/assets/winbond.svg';
import ymtc from '@/assets/ymtc.png';

const logos = {
    biwin,
    cxmt,
    elpida,
    esmt,
    etron,
    gigadevice,
    issi,
    kingston,
    kioxia,
    longsys,
    micron,
    nanya,
    phison,
    sandisk,
    samsung,
    siliconmotion,
    skhynix,
    sndk: sandisk,
    solidigm,
    spectek,
    winbond,
    ymtc
};

const vendorAliases = {
    '佰维': 'biwin',
    '长鑫存储': 'cxmt',
    '尔必达': 'elpida',
    '晶豪': 'esmt',
    '晶豪科技': 'esmt',
    '钰创': 'etron',
    '鈺創': 'etron',
    '钰创科技': 'etron',
    '鈺創科技': 'etron',
    '兆易': 'gigadevice',
    '兆易创新': 'gigadevice',
    '兆易創新': 'gigadevice',
    '英特尔': 'solidigm',
    '金士顿': 'kingston',
    '铠侠': 'kioxia',
    '江波龙': 'longsys',
    '美光': 'micron',
    '南亚': 'nanya',
    '群联': 'phison',
    '三星': 'samsung',
    'sk海力士': 'skhynix',
    '闪迪': 'sndk',
    '慧荣': 'siliconmotion',
    '慧榮': 'siliconmotion',
    '慧荣科技': 'siliconmotion',
    '慧榮科技': 'siliconmotion',
    '美光降级': 'spectek',
    '华邦': 'winbond',
    '華邦': 'winbond',
    '华邦电子': 'winbond',
    '華邦電子': 'winbond',
    '长江存储': 'ymtc',
    elitesemiconductormemorytechnology: 'esmt',
    elitesemiconductormicroelectronicstechnology: 'esmt',
    etrontechnology: 'etron',
    foresee: 'longsys',
    gd: 'gigadevice',
    gigadevicesemiconductor: 'gigadevice',
    intel: 'solidigm',
    integratedsiliconsolution: 'issi',
    integratedsiliconsolutioninc: 'issi',
    'integratedsiliconsolutioninc.': 'issi',
    lexar: 'longsys',
    sandiskkioxia: 'sandisk',
    smi: 'siliconmotion',
    toshiba: 'kioxia',
    western: 'sndk',
    westerndigital: 'sndk',
    winbondelectronics: 'winbond',
    wd: 'sndk'
};

const darkLogoKeys = new Set(['biwin', 'gigadevice', 'micron', 'siliconmotion', 'solidigm']);

export function getVendorLogoKey(vendor) {
    const key = String(vendor || '').trim().toLowerCase().replace(/[\s/_-]+/g, '');
    return vendorAliases[key] || key;
}

export function isVendorLogoDark(vendor) {
    return darkLogoKeys.has(getVendorLogoKey(vendor));
}

export default function getVendorLogo(vendor) {
    return logos[getVendorLogoKey(vendor)] || '';
}
