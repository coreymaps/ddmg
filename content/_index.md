---
# Leave the homepage title empty to use the site title
title: DDMG
date: 2022-10-24
type: landing

sections:
  - block: hero
    content:
      title:
      image:
        filename: welcome.jpg
      text: Our goal is to make better use of satellite data to improve the transparency, accountability, and equity in reporting and awareness of war's effects on people and places.

  - block: collection
    content:
      title: Recent and Upcoming Events
      text: ""
      count: 5
      filters:
        folders:
          - event
    design:
      view: card
      columns: '1'

  - block: collection
    content:
      title: Latest News
      subtitle:
      text:
      count: 5
      filters:
        author: ''
        category: ''
        exclude_featured: false
        publication_type: ''
        tag: ''
      offset: 0
      order: desc
      page_type: media
    design:
      view: card
      columns: '1'

  - block: collection
    content:
      title: Recent Publications
      text: ""
      count: 5
      filters:
        folders:
          - publication
        publication_type: 'article-journal'
    design:
      view: citation
      columns: '1'

  - block: markdown
    content:
      title:
      subtitle:
      text: |
        {{% cta cta_link="./people/" cta_text="Meet the team →" %}}
    design:
      columns: '1'
---
