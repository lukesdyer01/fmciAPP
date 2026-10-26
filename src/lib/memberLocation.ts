export interface MemberLocation { city: string; state: string; country: string }

const us = 'AL:Alabama|AK:Alaska|AZ:Arizona|AR:Arkansas|CA:California|CO:Colorado|CT:Connecticut|DE:Delaware|DC:District of Columbia|FL:Florida|GA:Georgia|HI:Hawaii|ID:Idaho|IL:Illinois|IN:Indiana|IA:Iowa|KS:Kansas|KY:Kentucky|LA:Louisiana|ME:Maine|MD:Maryland|MA:Massachusetts|MI:Michigan|MN:Minnesota|MS:Mississippi|MO:Missouri|MT:Montana|NE:Nebraska|NV:Nevada|NH:New Hampshire|NJ:New Jersey|NM:New Mexico|NY:New York|NC:North Carolina|ND:North Dakota|OH:Ohio|OK:Oklahoma|OR:Oregon|PA:Pennsylvania|RI:Rhode Island|SC:South Carolina|SD:South Dakota|TN:Tennessee|TX:Texas|UT:Utah|VT:Vermont|VA:Virginia|WA:Washington|WV:West Virginia|WI:Wisconsin|WY:Wyoming|AS:American Samoa|GU:Guam|MP:Northern Mariana Islands|PR:Puerto Rico|VI:U.S. Virgin Islands'
const ca = 'AB:Alberta|BC:British Columbia|MB:Manitoba|NB:New Brunswick|NL:Newfoundland and Labrador|NS:Nova Scotia|NT:Northwest Territories|NU:Nunavut|ON:Ontario|PE:Prince Edward Island|QC:Quebec|SK:Saskatchewan|YT:Yukon'
export const subdivisions = (country: string) => (country === 'US' ? us : country === 'CA' ? ca : '').split('|').filter(Boolean).map(pair => { const [code, name] = pair.split(':'); return { code, name } })
const names = new Intl.DisplayNames(['en'], { type: 'region' })
export const countryName = (code: string) => code ? names.of(code) ?? code : ''
export const countries = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ').map(code => ({ code, name: countryName(code) })).sort((a,b) => a.name.localeCompare(b.name))

function canonicalState(state: string, country: string) {
  const value = state.trim()
  return subdivisions(country).find(region => region.code.toLowerCase() === value.toLowerCase() || region.name.toLowerCase() === value.toLowerCase())?.code ?? value
}

export function readMemberLocation(profile: Partial<MemberLocation> & { location?: string | null }): MemberLocation {
  if (profile.city || profile.state || profile.country) return { city: profile.city ?? '', state: canonicalState(profile.state ?? '', profile.country ?? ''), country: profile.country ?? '' }
  const legacy = (profile.location ?? '').trim()
  if (!legacy) return { city: '', state: '', country: 'US' }
  const parts = legacy.split(',').map(part => part.trim())
  if (parts.length === 2) {
    for (const country of ['US', 'CA']) {
      const region = subdivisions(country).find(r => [r.code.toLowerCase(), r.name.toLowerCase()].includes(parts[1].toLowerCase()))
      if (region) return { city: parts[0], state: region.code, country }
    }
    const country = countries.find(c => c.name.toLowerCase() === parts[1].toLowerCase())
    if (country) return { city: parts[0], state: '', country: country.code }
  }
  // Preserve ambiguous legacy text for review rather than guessing a country.
  return { city: legacy, state: '', country: '' }
}

export function formatMemberLocation(value: MemberLocation) {
  const city = value.city.trim(), state = canonicalState(value.state, value.country)
  if (!city && !state) return ''
  return [city, state, value.country === 'US' ? '' : countryName(value.country)].filter(Boolean).join(', ')
}

export function memberLocationKey(profile: Partial<MemberLocation> & { location?: string | null }) {
  if (!profile.city && !profile.state && !profile.location?.trim()) return ''
  const value = readMemberLocation(profile)
  return [value.city.trim(), canonicalState(value.state, value.country), value.country].join('|').toLowerCase()
}
