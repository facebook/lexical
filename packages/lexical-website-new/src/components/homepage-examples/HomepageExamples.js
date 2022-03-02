import React, {useState} from 'react';

import styles from './HomepageExamples.module.css';

function Pills({pills, activeIndex, onClick}) {
  return (
    <ul className="pills" role="tablist">
      {pills.map((pill, index) => {
        const classNames = ['pills__item'];
        const isSelected = activeIndex === index;
        if (isSelected) {
          classNames.push('pills__item--active');
        }
        return (
          <li className={classNames.join(' ')}>
            <a
              className={styles.tabAnchor}
              aria-selected={isSelected}
              href=""
              role="tab"
              id={`example-tab-${index}`}
              onClick={() => {
                onClick(index);
              }}>
              {pill.label}
            </a>
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
      id: 'example-feature-1',
      label: 'Feature 1',
    },
    {
      content: 'Feature 2 content',
      id: 'example-feature-2',
      label: 'Feature 2',
    },
    {
      content: 'Feature 3 content',
      id: 'example-feature-3',
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
      <div
        className="row"
        id={activePill.id}
        role="tabpanel"
        aria-labelledby={`example-tab-${activeIndex}`}>
        <div className="col">{activePill.content}</div>
        <div className="col">CodeSandbox</div>
      </div>
    </div>
  );
}
