import React from 'react'

class CoC extends React.Component {
  render() {
    return <span className='coc'>
      I agree to adhere to the <a href="https://julialang.org/community/standards/">Julia Code of Conduct</a> in all public channels. In particular,
      <blockquote>
        <p>
          <strong>Be respectful and inclusive.</strong>
          Please do not use overtly sexual language or imagery, and do not attack anyone based on any aspect of personal identity, including gender, sexuality, religion, ethnicity, race, age or ability. Keep in mind that what you write in public forums is read by many people who don’t know you personally, so please refrain from making prejudiced or sexual jokes and comments – even ones that you might consider acceptable in private. Ask yourself if a comment or statement might make someone feel unwelcomed or like an outsider.
        </p>

        <p>
          In particular, do not sexualize the term “Julia” or any other aspects of the project. While “Julia” is a female name in many parts of the world, the programming language is not a person and does not have a gender.
        </p>
      </blockquote>
      <p>
        Additionally, I will not abuse the Slack by sending unwelcome direct messages or excessively pinging other members of the Slack. I understand that a pattern of abusive behavior can result in being disinvited from the Slack group.
      </p>
    </span>
  }
}

export default CoC
