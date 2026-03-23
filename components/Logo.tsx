export default function Logo() {
  return (
    <div className="flex items-center gap-2 select-none">
      {/* 3-layer staggered lines icon */}
      <div className="flex flex-col gap-[3px]">
        <div className="flex">
          <div style={{ width: '20px', height: '4px', background: '#556B2F', borderRadius: '2px', marginLeft: '6px' }} />
        </div>
        <div className="flex">
          <div style={{ width: '20px', height: '4px', background: '#6b8a3a', borderRadius: '2px', marginLeft: '3px' }} />
        </div>
        <div className="flex">
          <div style={{ width: '20px', height: '4px', background: '#a8c282', borderRadius: '2px', marginLeft: '0px' }} />
        </div>
      </div>
      <span style={{ fontWeight: 700, fontSize: '20px', color: '#283417', letterSpacing: '-0.5px' }}>
        Strata
      </span>
    </div>
  )
}
