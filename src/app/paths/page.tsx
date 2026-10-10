import Link from 'next/link';
const paths = [
  ['Data', 'Find patterns, answer questions, and turn information into useful decisions.'],
  [
    'Web Development',
    'Build accessible websites and useful applications, one small project at a time.',
  ],
  ['Cybersecurity', 'Learn to protect people, devices and information from digital threats.'],
  [
    'AI and Machine Learning',
    'Explore how machines learn from examples and solve everyday problems.',
  ],
  [
    'UI/UX Design',
    'Understand people’s needs and design experiences that work better for everyone.',
  ],
  [
    'Digital Marketing',
    'Help ideas reach the right people through thoughtful content and campaigns.',
  ],
  [
    'Business and Entrepreneurship',
    'Test ideas, understand customers, and build a sustainable small business.',
  ],
  [
    'Writing and Communication',
    'Express ideas clearly and connect with readers through useful writing.',
  ],
  ['Project Management', 'Help teams turn a shared goal into organized, achievable work.'],
  [
    'Teaching and Facilitation',
    'Create learning experiences that help others understand and grow.',
  ],
];
export default function Page() {
  return (
    <div className="page-container">
      <span className="eyebrow">TEN PATHS. YOUR POSSIBILITIES.</span>
      <h1>What could your next chapter look like?</h1>
      <p>
        Explore tech and non-tech skills. You can change your path as you discover what you enjoy.
      </p>
      <div className="path-catalog">
        {paths.map(([title, description]) => (
          <article key={title}>
            <h2>{title}</h2>
            <p>{description}</p>
            <Link href="/quiz" className="page-link">
              See if this fits you →
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
