import intel from '@/assets/intel.svg';
import kioxia from '@/assets/kioxia.svg';
import micron from '@/assets/micron.svg';
import phison from '@/assets/phison.svg';
import samsung from '@/assets/samsung.svg';
import skhynix from '@/assets/skhynix.svg';
import spectek from '@/assets/spectek.gif';
import wd from '@/assets/wd.svg';
import ymtc from '@/assets/ymtc.png';

const logos = {
    intel,
    kioxia,
    micron,
    phison,
    samsung,
    skhynix,
    spectek,
    westerndigital: wd,
    ymtc
};

export default function getVendorLogo(vendor) {
    return logos[String(vendor || '').toLowerCase()] || '';
}
