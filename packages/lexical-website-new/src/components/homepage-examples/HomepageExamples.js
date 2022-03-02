import React, {useState} from 'react';

function Pills({pills, activeIndex, onClick}) {
  return (
    <ul className="pills">
      {pills.map((pill, index) => {
        const classNames = ['pills__item'];
        if (activeIndex === index) {
          classNames.push('pills__item--active');
        }
        return (
          <li
            className={classNames.join(' ')}
            onClick={() => {
              onClick(index);
            }}>
            {pill.label}
          </li>
        );
      })}
    </ul>
  );
}

export default function HomepageExamples() {
  const [activeIndex, setActiveIndex] = useState(0);
  const pills = [
    {
      content: 'Feature 1 content',
      label: 'Feature 1',
    },
    {
      content: 'Feature 2 content',
      label: 'Feature 2',
    },
    {
      content: 'Feature 3 content',
      label: 'Feature 3',
    },
  ];
  const activePill = pills[activeIndex];
  return (
    <div className="container">
      <div className="row">
        <Pills
          pills={pills}
          activeIndex={activeIndex}
          onClick={setActiveIndex}
        />
      </div>
      <div className="row">
        <div className="col">{activePill.content}</div>
        <div className="col">CodeSandbox</div>
      </div>
    </div>
  );
}
