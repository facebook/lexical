import Link from 'next/link';

const Header = () => {
  return (
    <div className={'header'}>
      <a
        className={'logo'}
        href={'http://emergence-engineering.com'}
        target={'_blank'}>
        {/*<Image src={"/ee-logo.svg"} width={250} height={42} alt={""} />*/}
        <span>Emergence Engineering</span>
      </a>
      <div className={'navbar'}>
        <div className={'navbar__nav'}>
          <Link href={'/prosemirror'}>ProseMirror</Link>
        </div>
        <div className={'navbar__nav'}>
          <Link href={'/lexical'}>Lexical</Link>
        </div>
      </div>
    </div>
  );
};

export default Header;
