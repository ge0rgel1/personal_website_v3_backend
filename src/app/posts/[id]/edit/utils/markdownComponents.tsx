import React, { ReactNode, ComponentPropsWithoutRef } from 'react'

// React Markdown components with comprehensive styling
export const markdownComponents = {
  h1: ({ children, ...props }: ComponentPropsWithoutRef<'h1'>) => (
    <h1 className="text-3xl font-bold text-gray-900 mb-6 mt-8 first:mt-0" {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }: ComponentPropsWithoutRef<'h2'>) => (
    <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-6" {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }: ComponentPropsWithoutRef<'h3'>) => (
    <h3 className="text-xl font-bold text-gray-900 mb-3 mt-5" {...props}>{children}</h3>
  ),
  h4: ({ children, ...props }: ComponentPropsWithoutRef<'h4'>) => (
    <h4 className="text-lg font-medium text-gray-900 mb-2 mt-4" {...props}>{children}</h4>
  ),
  h5: ({ children, ...props }: ComponentPropsWithoutRef<'h5'>) => (
    <h5 className="text-base font-medium text-gray-900 mb-2 mt-3" {...props}>{children}</h5>
  ),
  h6: ({ children, ...props }: ComponentPropsWithoutRef<'h6'>) => (
    <h6 className="text-sm font-medium text-gray-900 mb-2 mt-3" {...props}>{children}</h6>
  ),
  p: ({ children, ...props }: ComponentPropsWithoutRef<'p'>) => (
    <p className="text-gray-700 leading-relaxed mb-4" {...props}>{children}</p>
  ),
  ul: ({ children, ...props }: ComponentPropsWithoutRef<'ul'>) => (
    <ul className="list-disc list-inside mb-4 pl-4 text-gray-700" {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }: ComponentPropsWithoutRef<'ol'>) => (
    <ol className="list-decimal list-inside mb-4 pl-4 text-gray-700" {...props}>{children}</ol>
  ),
  li: ({ children, ...props }: ComponentPropsWithoutRef<'li'>) => (
    <li className="mb-1" {...props}>{children}</li>
  ),
  table: ({ children, ...props }: ComponentPropsWithoutRef<'table'>) => (
    <div className="my-6 flex justify-center">
      <table className="border-collapse border border-gray-300 bg-white shadow-sm rounded-lg overflow-hidden" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }: ComponentPropsWithoutRef<'thead'>) => (
    <thead className="bg-gray-50" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }: ComponentPropsWithoutRef<'tbody'>) => (
    <tbody {...props}>
      {children}
    </tbody>
  ),
  tr: ({ children, ...props }: ComponentPropsWithoutRef<'tr'>) => (
    <tr className="border-b border-gray-200 hover:bg-gray-50" {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }: ComponentPropsWithoutRef<'th'>) => (
    <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900 bg-gray-100" {...props}>
      <div className="break-words">{children}</div>
    </th>
  ),
  td: ({ children, ...props }: ComponentPropsWithoutRef<'td'>) => (
    <td className="border border-gray-300 px-4 py-3 text-gray-700" {...props}>
      <div className="break-words">{children}</div>
    </td>
  ),
  blockquote: ({ children, ...props }: ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote className="border-l-4 border-blue-500 bg-blue-50 pl-6 pr-4 py-4 my-6 italic text-gray-700" {...props}>
      {children}
    </blockquote>
  ),
  strong: ({ children, ...props }: ComponentPropsWithoutRef<'strong'>) => (
    <strong className="font-bold text-gray-900" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }: ComponentPropsWithoutRef<'em'>) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),
  img: ({ src, alt, ...props }: ComponentPropsWithoutRef<'img'>) => {
    // Return just the img element with display block to avoid paragraph nesting issues
    return (
      <img 
        src={src} 
        alt={alt} 
        className="w-full rounded-lg shadow-md my-6 block" 
        {...props} 
      />
    )
  },
  code: ({ className, children, ...props }: ComponentPropsWithoutRef<'code'>) => {
    const isInline = !className
    return isInline ? (
      <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-sm font-mono" {...props}>
        {children}
      </code>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    )
  },
  pre: ({ children, ...props }: ComponentPropsWithoutRef<'pre'>) => (
    <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto my-4" {...props}>
      {children}
    </pre>
  ),
  a: ({ href, children, ...props }: ComponentPropsWithoutRef<'a'>) => (
    <a 
      href={href} 
      className="text-blue-600 hover:text-blue-800 hover:underline" 
      target="_blank" 
      rel="noopener noreferrer" 
      {...props}
    >
      {children}
    </a>
  ),
  hr: ({ ...props }: ComponentPropsWithoutRef<'hr'>) => (
    <hr className="border-gray-300 my-8" {...props} />
  ),
  div: ({ className, children, ...props }: ComponentPropsWithoutRef<'div'>) => {
    // Handle KaTeX display math blocks
    if (className?.includes('math') && (className?.includes('display') || className?.includes('katex-display'))) {
      return (
        <div className="block my-6 w-full text-center" {...props}>
          <div className={className} style={{ fontSize: '1.2em', display: 'block' }}>
            {children}
          </div>
        </div>
      )
    }
    // Handle other divs normally
    return <div className={className} {...props}>{children}</div>
  },
}
