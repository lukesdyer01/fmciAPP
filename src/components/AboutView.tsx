const FOCUS_AREAS = [
  { icon: '🕊', title: 'Apostolic-Prophetic Ministry', text: 'Raising up and developing apostolic-prophetic teams equipped to serve alongside local church leadership.' },
  { icon: '⛪', title: 'Local Church Advancement', text: "Helping local churches progress toward their God-given destiny through relational partnership rather than hierarchy." },
  { icon: '🌍', title: 'Community & Kingdom Transformation', text: 'Advancing the Kingdom of God in the community so that societal transformation is released, not just spoken about.' },
  { icon: '⚔️', title: 'Spiritual Warfare', text: "Standing against opposition to God's will in the culture, contending for what Scripture calls for, not against people." },
  { icon: '🍇', title: 'New Wineskins', text: 'Building relational, five-fold structures suited to how the 21st-century Church actually gathers and serves — not a rigid denominational model.' },
]

const EMPHASIS = [
  {
    title: 'Ministry to The Lord',
    text: 'Scripturally-based and Spirit-energized harp, bowl, and crown worship and praise.',
    refs: 'Acts 15:16; Revelation 4:10; Revelation 5:8',
  },
  {
    title: 'Five-Fold Ministry Gifts',
    text: 'These raise up and equip local leaders, local churches, and regional training centers.',
    refs: 'Ephesians 4:11-13',
  },
  {
    title: 'Apostolic Centers, Apostolic Teams, and Local Churches',
    text: 'These are the divinely ordained vehicles that extend the Kingdom of God in cities, regions, and nations.',
    refs: 'Acts 13:1-4; Romans 1:5; Romans 15:15-29',
  },
  {
    title: 'The Global Mission of The Church',
    text: 'Our focus in the nations is the training and equipping of indigenous church leaders, government leaders, and marketplace leaders in a Kingdom worldview and economic evangelism.',
    refs: 'Isaiah 2:1-4',
  },
  {
    title: 'Intercessory Prayer',
    text: 'Our emphases are: (1) raising up each local church to be a house of prayer for all nations; and (2) releasing imprecatory prayers against the enemies of the Gospel.',
    refs: 'Matthew 21:13; Isaiah 56:7; Revelation 6:10',
  },
  {
    title: 'The Commissioning of Kingdom Leaders',
    text: 'This involves encouraging and releasing members of the Body of Christ to influence and impact the seven mountains of culture beyond the family and the church: civil government, education, economy, media, arts and entertainment.',
    refs: '',
  },
  {
    title: 'Prophetic Ministry to Civil Governments',
    text: 'The transformation of societies and nations is released through a relational partnership of godly spiritual leadership and godly civil government leadership.',
    refs: 'Daniel 11:1; Nehemiah 2:1-8',
  },
]

const VISION_FACILITATION = [
  'Restoring Biblical order in the family, church, and civil government.',
  'Equipping the people of God through the five-fold Ascension Gifts of Christ.',
  'Connecting spiritual fathers and spiritual sons in transgenerational ministry.',
  'Embracing reformation in the Church so that the Body of Christ is restored to the New Testament Apostolic Pattern and thereby enabled to embrace new wineskins of ministry for the 21st century.',
  'Pursuing personal, societal, and cultural transformation in cities, regions, and nations until we see transformation according to the revelation of advancing Kingdom of God in the earth.',
]

const FAITH_INTRO = [
  "We are an apostolic family seeking the new wineskins of the 21st century Church and pursuing transformation of society and culture.",
  "We are a prophetic army enlisted to contend with the spiritual forces in the earth who oppose the implementation of our Father’s will in history.",
]

const FAITH_SECTIONS: { title: string; paragraphs: string[]; note?: string }[] = [
  {
    title: "The Holy Scriptures",
    paragraphs: [
      "The Bible is the very word of God; it is inerrant, infallible, inspired, and the final revelation of God to man.",
      "Both the Old and New Testaments have been inspired by God through plenary and verbal inspiration, thus securing for man an infallible record of truth.",
      "The Bible is fully authoritative providing the terms by which all the created universe must be interpreted, granting man an infallible rule of faith and practice, and revealing God’s will to man.",
      "The Bible has, by God’s providential care, been kept pure in all ages.",
    ],
    note: "For a fuller expression of our faith in the Bible, we recommend and affirm the following document: The Chicago Statement On Biblical Inerrancy. This is available from the Federation.",
  },
  {
    title: "The Doctrine of God",
    paragraphs: [
      "There is only one living and true God, Creator and Sustainer of the universe, Who is self-existent, eternal, supreme, incomprehensible, almighty. God is Spirit in Whom all divine attributes or perfections inhere and from Whom they cannot be separated.",
      "God’s attributes are both incommunicable and communicable. These incommunicable attributes, of which man cannot partake and which emphasize God’s transcendence, are the independence or aseity of God (God is sufficient unto Himself, dependent upon nothing besides His own being); the immutability of God (God does not and cannot change); the infinity of God (in relation to time, God is eternal, in relation to space, God is omnipresent); and the unity of God (God is singularly one and in no sense composed of parts or aspects that existed prior to Himself).",
      "The communicable attributes of God stress God’s immanence. God is light; God’s knowledge of Himself is self-contained, self-referential, and absolute. God is holy, internally and externally perfect. God is sovereign, omnipotent, working all things according to the counsel of His own immutable and righteous will.",
      "God exists as a tri-personality, the Trinity, co-substantial without subordination, co-eternal, and co-equal; three distinct persons in unity whose diversity and unity are underived.",
    ],
  },
  {
    title: "The Doctrine of Man",
    paragraphs: [
      "Man is created in God’s image, originally with moral attributes of true knowledge, true righteousness, and true holiness while, at the same time, possessing none of God’s incommunicable attributes. Man is like God, but on a creaturely scale. God is infinite and man is finite.",
      "Man was created from the earth to have dominion over the earth. As a prophet, man was to interpret the world; as a priest, man was to guard the world and consecrate it to God’s glory; and as a king, man was to rule over the world as God’s vice-regent.",
      "As a creature, man was to live in accordance with the laws which God had placed in His creation, being both responsible and accountable to God. Adam and Eve, being tempted by Satan, sought to interpret the universe without reference to God. By this sin, they fell from their original communion with God.",
      "Defiled in all parts and faculties, man now inherits the guilt of sin, the corrupted nature, and the death of sin which passed to all Adam’s posterity.",
    ],
  },
  {
    title: "The Doctrine of Christ",
    paragraphs: [
      "Jesus is the only begotten Son of God, the second person in the Trinity (Godhead), existing from all eternity with the Father, fully equal with the Father; Who in the incarnation assumed a human nature. In Christ, the human and divine natures are so related that they are two natures, without confusion, without change, without division, without separation. (Creed of Chalcedon).",
      "God, in His eternal purpose, chose His Son to be the mediator between God and man. Christ, as true Prophet, did reveal to man the will and word of God; as true Priest, did reconcile this world unto God by offering up Himself as the propitiatory sacrifice; and, as true King, did subdue, restrain, and conquer His people and all His enemies.",
      "Jesus was born of the Virgin Mary, was made under the law, did perfectly fulfill the law, suffered, was crucified, and died. He was buried, yet saw no corruption; and on the third day, He arose from the dead. He ascended into heaven where He lives to make intercession and from where He rules from the throne of David until all His enemies are made His footstool.",
    ],
  },
  {
    title: "The Doctrine of Salvation",
    paragraphs: [
      "By his fall, Adam not only corrupted himself and all his posterity, but also made necessary the infliction of the prescribed penalty of death. Man was morally polluted, guilty, and incapable of paying the incurred debt.",
      "God chose to accept the unmerited sufferings of Christ as just equivalent for the suffering due to sinners. Jesus, discharging the penalty due man through His vicarious suffering and death, has fully satisfied the justice of His Father and has purchased reconciliation and an everlasting inheritance for His people.",
      "Jesus restores man to holiness and life through His perfect obedience; the merits of Christ’s obedience are imputed to His people as their righteousness.",
      "Salvation is by grace; is wholly the gift of God received by faith. Good works are not meritorious ground but rather the fruit and proof of salvation.",
      "The Holy Spirit, the third person of the Trinity, Who proceeded from the Father and The Son and Who is co-equal with the Father and The Son, does apply to us the redemption Christ purchased for us. The Spirit, working conviction of sin, righteousness, and judgment, and revealing the person and work of Jesus Christ, is the Agent of regeneration, sanctification, and preservation.",
    ],
  },
  {
    title: "The Doctrine of the Church",
    paragraphs: [
      "The universal church, which is invisible, consists of the whole number of God’s people, from all ages, gathered into one body under Christ’s headship.",
      "Endued with the power of the Holy Spirit, and commissioned to make disciples of all nations (ethnic groupings), the Church, God’s holy nation, is the steward of the Kingdom of God, proclaiming the Word, administering the sacraments (baptism and communion), and exercising discipline in terms of the Scripture.",
      "The local church, which is also the body of Christ, is called to represent and embody God’s will and purpose in a community and minister Christ’s life to all who will respond to the proclamation of the Kingdom of God.",
    ],
  },
  {
    title: "The Doctrine of Last Things",
    paragraphs: [
      "God has appointed a day wherein He will judge all men by His Son and destroy the last enemy, i.e., death, at the return of His Son.",
      "The Bible teaches an optimistic eschatology. We believe that the Triune God has reigned sovereignly as King of all creation throughout all time and that Jesus is the present King of kings and Lord of lords. We affirm that God’s active reign through Christ will increase until it is consummated at the actual, physical, and bodily second coming of Christ.",
      "Millennial views will not be used as a test for orthodoxy.",
    ],
  },
  {
    title: "Some Doctrinal Emphases and Distinctives",
    paragraphs: [
      "We emphasize a covenantal approach to Biblical interpretation rather than a dispensational approach.",
      "We affirm the validity of spiritual (charismatic) gifts continuing until the consummation of the age.",
      "We believe that the Ascension gifts of Christ listed in Ephesians 4:11 continue until the church is glorified at the second coming. We also believe that these “Ascension Apostolic Teams” minister in, through, and beyond the local church.",
      "We believe that the Kingdom of God is present and eternal. We affirm that the Kingdom has come definitively in the Christ-Event (His death, burial, resurrection, and ascension); we believe that the Kingdom is coming progressively in history (like leaven in the lump and seed growing in the ground); and we believe that the Kingdom will come consummatively at the return of Christ.",
      "We believe marriage is between a man and a woman.",
    ],
    note: "For a more comprehensive statement on the Kingdom of God, we recommend the Coalition On Revival document on the Kingdom. (This is available from the Federation.)",
  },
]

const REACH = [
  { n: '17+', label: 'Nations with relational connections' },
  { n: '6', label: 'Countries with apostolic linkages' },
  { n: 'Since 1980s', label: 'Serving local churches and leaders' },
]

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '14px', border: '1px solid var(--color-border)', padding: '24px' }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>{eyebrow}</div>
      <h2 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 800, color: 'var(--color-text-1)', fontFamily: 'var(--font-serif)' }}>{title}</h2>
      {children}
    </div>
  )
}

export default function AboutView() {
  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)',
        borderRadius: '16px', padding: '32px 28px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-30px', right: '-20px', fontSize: '140px', opacity: 0.06 }}>🏛</div>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-gold-light)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>About</div>
        <h1 style={{ margin: '0 0 10px', fontSize: '26px', fontWeight: 900, color: '#fff', fontFamily: 'var(--font-serif)', lineHeight: 1.25 }}>
          Federation of Ministers and Churches International
        </h1>
        <p style={{ margin: 0, fontSize: '15px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, maxWidth: '620px' }}>
          A relational network of five-fold ministries, local churches, chief musicians, intercessors, marketplace leaders, and compassion ministries — connected by calling, not hierarchy.
        </p>
      </div>

      {/* Reach stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        {REACH.map((r, i) => (
          <div key={i} style={{ backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '18px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--color-navy)', marginBottom: '4px' }}>{r.n}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-2)', fontWeight: 600, lineHeight: 1.4 }}>{r.label}</div>
          </div>
        ))}
      </div>

      {/* Mission */}
      <Section eyebrow="Mission Statement" title="Why FMCI Exists">
        <p style={{ margin: 0, fontSize: '15px', color: 'var(--color-text-1)', lineHeight: 1.75 }}>
          The Federation of Ministers and Churches International seeks to fulfill its vision by raising up and deploying apostolic-prophetic teams which will synergistically serve local church leaders. Through these relational partnerships, the local church will progress toward its God-given destiny, the Kingdom of God will be advanced in the community, and societal transformation will be released.
        </p>
      </Section>

      {/* Vision */}
      <Section eyebrow="Vision Statement" title="What We're Contending For">
        <p style={{ margin: '0 0 18px', fontSize: '15px', color: 'var(--color-text-1)', lineHeight: 1.75, fontStyle: 'italic' }}>
          "The vision of FMCI is to extend the Kingdom of God in history through cultural transformation according to the Dominion Mandate of Genesis 1:28 and the Great Commission of Matthew 28:19-20."
        </p>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
          The vision is facilitated by
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {VISION_FACILITATION.map((v, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                backgroundColor: 'var(--color-gold-bg)', border: '1px solid var(--color-gold-border)', color: 'var(--color-gold)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800,
              }}>{i + 1}</div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-2)', lineHeight: 1.6 }}>{v}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Focus areas */}
      <Section eyebrow="Focus" title="Core Focus Areas">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {FOCUS_AREAS.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                backgroundColor: 'var(--color-gold-bg)', border: '1px solid var(--color-gold-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px',
              }}>{f.icon}</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-1)', marginBottom: '2px' }}>{f.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-2)', lineHeight: 1.6 }}>{f.text}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Emphasis */}
      <Section eyebrow="Emphasis" title="What We Give Ourselves To">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {EMPHASIS.map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                backgroundColor: 'var(--color-navy)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800,
              }}>{i + 1}</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-1)', marginBottom: '2px' }}>{e.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-2)', lineHeight: 1.6 }}>{e.text}</div>
                {e.refs && (
                  <div style={{ fontSize: '12px', color: 'var(--color-gold)', fontStyle: 'italic', marginTop: '4px' }}>({e.refs})</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Statement of Faith */}
      <Section eyebrow="Doctrine" title="Statement of Faith">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {FAITH_INTRO.map((p, i) => (
            <p key={i} style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-1)', lineHeight: 1.7, fontStyle: 'italic' }}>{p}</p>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {FAITH_SECTIONS.map((s, i) => (
            <div key={i} style={{ borderTop: i > 0 ? '1px solid var(--color-border-light)' : 'none', paddingTop: i > 0 ? '20px' : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{
                  fontSize: '11px', fontWeight: 800, color: 'var(--color-gold)', flexShrink: 0,
                  padding: '2px 8px', borderRadius: '6px', backgroundColor: 'var(--color-gold-bg)', border: '1px solid var(--color-gold-border)',
                }}>SECTION {i + 1}</span>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-1)' }}>{s.title}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {s.paragraphs.map((p, j) => (
                  <p key={j} style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-2)', lineHeight: 1.7 }}>{p}</p>
                ))}
              </div>
              {s.note && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--color-text-3)', fontStyle: 'italic', lineHeight: 1.6 }}>
                  Note: {s.note}
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Leadership */}
      <Section eyebrow="Leadership" title="Founding Apostle">
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <img
            src="https://www.jimhodgesministries.com/uploads/1/4/6/2/146298067/jimhodgesa_orig.jpg"
            alt="Jim Hodges"
            style={{ width: '52px', height: '52px', borderRadius: '12px', flexShrink: 0, objectFit: 'cover' }}
          />
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-1)' }}>Jim Hodges</div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-2)', lineHeight: 1.6 }}>
              Founding Apostle of FMCI, and author of <em>Battle for Earth: Globalism vs. Nationhood</em>.
            </div>
          </div>
        </div>
      </Section>

      <div style={{ textAlign: 'center', padding: '4px 0 16px', fontSize: '12px', color: 'var(--color-text-3)' }}>
        Content adapted from jimhodgesministries.com
      </div>
    </div>
  )
}
