import { MemberRole, Platform } from '../constants/communityRoster';

export interface MemberSeed {
  handle: string;
  role: MemberRole;
  title?: string;
  notes?: string;
}

export interface GroupSeed {
  id: string;
  name: string;
  platform: Platform;
  url: string;
  notes?: string;
  members: MemberSeed[];
}

const owner = (handle: string, title?: string, notes?: string): MemberSeed => ({ handle, role: 'owner', title, notes });
const admin = (handle: string, title?: string, notes?: string): MemberSeed => ({ handle, role: 'admin', title, notes });
const bot = (handle: string): MemberSeed => ({ handle, role: 'bot' });

const telegram = (id: string, name: string, url: string, members: MemberSeed[], notes?: string): GroupSeed => ({
  id,
  name,
  platform: 'telegram',
  url,
  notes,
  members,
});

// Transcribed from "Mantle Network discord and Telegram Admin, mod and Bot
// list.pdf" (September 2026), in the sheet's column order. Titles are kept as
// the sheet gives them; only "Mod"/"Admin" are lower-cased so one title is one
// chip. Groups the sheet lists with no admin column are here with no members:
// the app shows them as "not recorded", never as "nobody is admin there".
export const ROSTER_BASELINE: GroupSeed[] = [
  telegram('mantle', 'Mantle', 'https://t.me/mantlenetwork', [
    owner('@ann_leminh'),
    admin('@communitywr', 'Mantle Team'),
    admin('@kolya5544', 'mod'),
    admin('@hadukemv', 'mod'),
    admin('@shaquibhussain', 'mod'),
    admin('@SantiagoGR78', 'LatAm CM'),
    admin('@m_encrypto', 'JP Region CM'),
    admin('@SlimOnShark', 'mod'),
    admin('@FinnLi777', 'Mantle Team'),
    admin('@Luismatz', 'mod'),
    admin('@MrAlvand', 'mod'),
  ]),
  telegram('mantle-news', 'Mantle Announcement', 'https://t.me/mantlenews', []),
  telegram('mantle-devs', 'Mantle Dev Announcements', 'https://t.me/mantledevs', [
    owner('@waynekwh'),
    admin('@KarpatZoloto', 'CommunitySteward'),
    admin('@communitywr'),
    admin('@nfterrax', 'mod'),
    admin('@Luismatz', 'mod'),
    admin('@hadukemv', 'mod'),
    admin('@m_encrypto', 'JP region CM'),
    admin('@Alban0913', 'Mantle Team'),
    admin('@fateno123', 'Mantle Team'),
    admin('@SlimOnShark', 'mod'),
    admin('@jonlkh', 'Mantle Team'),
    admin('@ann_leminh'),
    admin('@jack_nomad', 'Mantle Team'),
    admin('@ashleyjychen', 'Mantle Team'),
    admin('@jaredcj', 'Mantle Team'),
    admin('@leethelily', 'Mantle Team'),
    admin('@ZoeyZhou', 'Mantle Team'),
    admin('@bitgorilla', 'Mantle Team'),
    admin('@Catepilar', 'Mantle Team'),
    admin('@NovianiP', 'Mantle Team'),
    admin('@gabrielgarethfoo', 'Mantle Team'),
    admin('@rusenkiy', 'mod'),
    admin('@Afkbyte', 'Mantle Advisor'),
    admin('@Libevm', 'Mantle Team'),
    admin('@raymondsg', 'Mantle Team'),
    admin('@lilsophh', 'Mantle Team'),
    admin('@francescatyx', 'Mantle Team'),
    admin('@Lbrian13', 'admin'),
  ]),
  telegram('meth', 'mETH Protocol', 'https://t.me/mETHProtocol_official', [
    owner('@speicherx'),
    admin('@hadukemv', 'mod'),
    admin('@Luismatz', 'mod'),
    admin('@SlimOnShark', 'mod'),
    admin('@nfterrax', 'mod'),
    admin('@rusenkiy', 'mod'),
  ]),
  telegram('meth-news', 'mETH Protocol Announcement', 'https://t.me/mETHProtocolNews', []),
  telegram('function', 'Function Community', 'https://t.me/FBTC_Official', [
    owner('@LeoZhang'),
    admin('@KarpatZoloto'),
    admin('@elliechen0909'),
    admin('@Lbrian13'),
    admin('@rusenkiy'),
    admin('@SlimOnShark', 'Firekeeper'),
    admin('@nfterrax', 'Firekeeper'),
  ]),
  telegram('function-news', 'Function News', 'https://t.me/functionbtc', []),
  telegram('mantle-cn', 'Mantle China', 'https://t.me/Mantle_CN', [
    owner('@FinnLi777'),
    admin('@cloris_m', 'Mantle Team'),
    admin('@Clairewang0x', 'admin'),
    admin('@Sing_22518', 'Mantle Team'),
    admin('@SlimOnShark', 'admin'),
    bot('Rose'),
    bot('Combot'),
  ]),
  telegram('mantle-vn', 'Mantle Vietnam', 'https://t.me/Mantle_VN', [
    owner('@ann_leminh', 'Mantle Team'),
    admin('@jesessa2', 'admin'),
    bot('Rose'),
    bot('Combot'),
    bot('CoinTrendzBot'),
  ]),
  telegram('mantle-latam', 'Mantle Latin America', 'https://t.me/MantleLatAm', [
    admin('@Luismatz', 'Community Steward'),
    admin('@hadukemv', 'Community Steward'),
    admin('@SantiagoGR78', 'admin'),
    owner('@Lbrian13'),
    admin('@zeroxVEER', 'admin'),
    admin('@cush0', 'admin'),
    admin('@Solyacuariana', 'admin'),
    admin('@chukiut', 'admin'),
  ]),
  telegram('mantle-ua', 'Mantle Ukraine', 'https://t.me/Mantle_UA', [
    owner('@Lbrian13'),
    admin(
      '@KarpatZoloton13',
      'Mantle Team',
      'Spelled KarpatZoloton13 in the sheet but @KarpatZoloto everywhere else. Check which is right.',
    ),
    admin('@rusenkiy', 'True OG'),
  ]),
  telegram(
    'mantle-kr',
    'Mantle Korea',
    'https://t.me/Mantle_KR',
    [bot('Rose'), bot('Combot'), bot('Group Help'), bot('TgGrow'), bot('Catizen-Mantle')],
    'The sheet has no admin list for Korea. These five bots sit in the column after Mantle Ukraine, which is Korea. Check whether they belong to Ukraine instead.',
  ),
  telegram('mantle-ru', 'Mantle Russia', 'https://t.me/Mantle_RU', [
    owner(
      'Alex',
      'Mantle Team',
      'Highlighted red in the sheet like the other group owners, with no @handle given. Confirm the owner and their handle.',
    ),
    admin('@jesessa2', 'admin'),
    admin('@KarpatZoloto', 'Mantle Team'),
    admin('@rusenkiy', 'mod'),
    admin('@nfterrax', 'Mantle Team'),
    admin('@hadukemv', 'mod'),
    admin('@SlimOnShark', 'mod'),
    admin('@Luismatz', 'mod'),
    bot('Rose'),
    bot('Combot'),
    bot('Telegram Analytics Bot'),
    bot('Quiz Bot'),
  ]),
  telegram('mantle-jp', 'Mantle Japan', 'https://t.me/Mantle_JP', []),
  telegram(
    'mantle-id',
    'Mantle Indonesia',
    'https://t.me/Mantle_ID',
    [
      owner('@jesessa2'),
      admin('@rusenkiy', 'mod'),
      admin('@Luismatz', 'mod'),
      admin('@nfterrax', 'mod'),
      admin('@ann_leminh', 'mod'),
      admin('@SlimOnShark', 'mod'),
      admin('@hadukemv', 'mod'),
      admin('@hizkiatarmadi', 'mod'),
    ],
    'The sheet gives this admin list no heading. It sits under the Mantle Indonesia column.',
  ),
  telegram('mantle-id-news', 'Mantle Indonesia News', 'https://t.me/MantleIDnews', []),
  telegram('mantle-in', 'Mantle India', 'https://t.me/MantleIndia', [admin('@KarpatZoloto', 'Mantle Team')]),
  telegram('mantlehood', 'Mantlehood', 'https://t.me/mantlehood', [
    owner('@jesessa2'),
    admin('@hadukemv', 'admin'),
    admin('@nfterrax', 'admin'),
    admin('@SlimOnShark', 'admin'),
    admin('@ann_leminh', 'admin'),
    admin('@Luismatz', 'admin'),
    admin('@jonlkh', 'mr limitless'),
    admin('@rusenkiy', 'admin'),
    admin('@gem3a', 'admin'),
    admin('@Lbrian13', 'brian pinkman'),
    bot('Rose'),
    bot('Combot'),
  ]),
  telegram('turing-hackathon', 'Mantle The Turing Test Hackathon', 'https://t.me/MantleTuringTestHackathon', [
    admin('@jeremychain', 'Dev'),
    admin('@takiminft', 'JP Mkt & Ops'),
    admin('@tahoexxx', 'Byreal Ops'),
    admin('@FinnLi777', 'Mantle Team'),
    admin('@Stanleylee01', 'Byreal-Support'),
    admin('@kev_intothewild', 'Co-Support'),
  ]),
];
