import * as React from 'react'

class CoC extends React.Component {
  render() {
    return <span className='coc'>
      I will adhere to the <a href="https://julialang.org/community/standards/">Julia Code of Conduct</a> in all public channels:
      <blockquote>
        <p>
          <strong>Be respectful and inclusive. </strong>
          Please do not use overtly sexual language or imagery, and do not attack anyone based on any aspect of personal identity, including gender, sexuality, religion, ethnicity, race, age, politics or ability. Keep in mind that what you write in public forums is read by many people who don’t know you personally, so please refrain from making prejudiced or sexual jokes and comments – even ones that you might consider acceptable in private. Ask yourself if a comment or statement might make someone feel unwelcomed or like an outsider.
        </p>

        <p>
          In particular, do not sexualize the term “Julia” or any other aspects of the project. While “Julia” is a female name in many parts of the world, the programming language is not a person and does not have a gender.
        </p>

        <p>Give credit. All participants in the Julia community are expected to respect copyright laws and ethical attribution standards. This applies to both code and written materials, such as documentation or blog posts. Materials that violate the law, are plagiaristic, or ethically dubious in some way will be removed from officially-maintained lists of resources.</p>

        <p>If you believe one of these standards has been violated, you can either file an issue on an appropriate repository or confidentially contact the Julia Stewards at stewards@julialang.org. Keep in mind that most mistakes are due to ignorance rather than malice.</p>

        <p>Be concise. Constructive criticism and suggestions are welcome, but high-traffic forums do not generally have the bandwidth for extensive discourse. Consider writing a blog post if you feel that you have enough to say on a particular subject.</p>

        <p>Get involved. The Julia community is built on a foundation of reciprocity and collaboration. Be aware that most community members contribute on a voluntary basis, so ideas and bug reports are ok, but demands are not. Pull requests are always welcomed – see the guidelines for contributing to read about how to get started.</p>
      </blockquote>
      <p className='ping_clause'>
        Additionally, I will not abuse the Slack by sending unwelcome direct messages or excessively pinging other members of the Slack. I understand that a pattern of abusive behavior can result in being disinvited from the Slack group.
      </p>
    </span>
  }
}

export default CoC
