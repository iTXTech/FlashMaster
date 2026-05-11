import biwin from '@/assets/biwin.svg';
import cxmt from '@/assets/cxmt.svg';
import elpida from '@/assets/elpida.svg';
import kingston from '@/assets/kingston.svg';
import kioxia from '@/assets/kioxia.svg';
import longsys from '@/assets/longsys.png';
import micron from '@/assets/micron.svg';
import nanya from '@/assets/nanya.png';
import phison from '@/assets/phison.svg';
import sandisk from '@/assets/sandisk.svg';
import samsung from '@/assets/samsung.svg';
import skhynix from '@/assets/skhynix.svg';
import solidigm from '@/assets/solidigm.png';
import spectek from '@/assets/spectek.gif';
import ymtc from '@/assets/ymtc.png';

const logos = {
    biwin,
    cxmt,
    elpida,
    kingston,
    kioxia,
    longsys,
    micron,
    nanya,
    phison,
    sandisk,
    samsung,
    skhynix,
    sndk: sandisk,
    solidigm,
    spectek,
    ymtc
};

const vendorAliases = {
    '佰维': 'biwin',
    '长鑫存储': 'cxmt',
    '尔必达': 'elpida',
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
    '美光降级': 'spectek',
    '长江存储': 'ymtc',
    foresee: 'longsys',
    intel: 'solidigm',
    lexar: 'longsys',
    sandiskkioxia: 'sandisk',
    toshiba: 'kioxia',
    western: 'sndk',
    westerndigital: 'sndk',
    wd: 'sndk'
};

const darkLogoKeys = new Set(['biwin', 'micron', 'solidigm']);

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
