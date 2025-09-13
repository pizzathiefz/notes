---
{"publish":true,"title":"Hugo  블로그 다국어 지원 (PaperMod Theme)","created":"2025-09-10","tags":["misc"],"cssclasses":""}
---


- 블로그 갈아엎는 병이 도져서 이번엔 Hugo로 도전, 테마는 [Papermod](https://adityatelange.github.io/hugo-PaperMod/) 를 선택했음
- 솔직히 블로그 파는 건 너무 쉬움 10분만에 함
	- [가이드](https://adityatelange.github.io/hugo-PaperMod/posts/papermod/papermod-installation/) 따라하고(hugo new site, git 설정, 레포 파서 push) 배포는 cloudfare pages 썼고 오랜만에 커스텀도메인도 하나 붙여줬음
- 근데 이번에 해보고 싶었던 게 다국어(라지만 그냥 영어버전) 지원인데 가이드가 그렇게 명확하진 않아서 좀 헤맸음


# 메인페이지
- 다른 모든 설정들처럼 메인 config파일 (나의 경우, `hugo.yaml`)에서 languages 설정이 필요하고 블로그 우상단의 메뉴들과 PaperMod의 HomeInfo의 Title 과 Content를 뭘 내보낼 건지도 이 안에서 같이 해줘야 함
	- 이게 구조가 원래 `menu` 와 `params`은 yaml파일 첫번째 뎁스에 있는 설정값인데, 다국어 지원이 필요한 부분이라서 같은 레벨로 ko와 en 밑에 들어간다고 보면 됨
	- 이렇게 설정하고 나면 원래 설정(`menu` 전체와 `params`의 `homeInfoParams` 부분)은 지워줘도 됨 
```
languages:
  ko:
    languageCode: ko-KR
    languageName: "한국어"
    title: "블로그 제목"
    weight: 10
    menu:
      main:
        - identifier: posts
          name: "포스트"
          url: /archives/
          weight: 10
        - identifier: search
          name: "검색"
          url: /search/
          weight: 15
    params:
      homeInfoParams:
        Title: "블로그 제목"
        Content: "태그라인"
  en:
    languageCode: en-US
    languageName: "English"
    title: "Blog Title"
    weight: 10
    menu:
      main:
        - identifier: posts
          name: "posts"
          url: /archives/
          weight: 10
        - identifier: search
          name: "search"
          url: /search/
          weight: 15
    params:
      homeInfoParams:
        Title: "Blog Title"
        Content: "blahblahblah"      
```

# 기타 레이아웃 요소들
- 테마에서 기본적으로 설정한 다국어 지원값들이 있음 (`theme`>`PaperMod`>`i18n`)
	- 예를 들면 이 안에 `en.yaml` 을 열면 `id: next_page`의 translation이 `Next`로 돼있음 
		- 다음 페이지 버튼이 어떤 단어로 표현되는지를 써준 값임
	- 이 설정들은 최상단의 `i18n` 폴더의 동명의 yaml 파일을 만들어서 덮어씌울 수 있음
		- 나는 이런 간단한 요소들은 영어버전과 한국어버전을 통일하고 싶었기 때문에 원래 한국어 설정은 `id: next_page`의 translation이 `다음` 이었지만 `i18n`에 `ko.yaml`을 만들어 영어랑 똑같이 바꿔줬다
- 주의) `theme`>`PaperMod` 안의 파일들은 직접 수정해도 submodule로 설치된 거라 바꿔도 git commit할때부터 제외되는 듯..

# 포스팅
- 보통 이런 방식으로 블로그 만들면 posts라는 폴더 내에 바로 하나의 마크다운 파일이 하나의 포스팅이 되지만
- 다국어 지원을 위해선 기본적으로 posts내에 my-post(포스트 제목)과 같은 폴더가 하나 더 있고 그 폴더 내에 `index.en.md` , `index.ko.md` 이렇게 영어버전과 한국어버전의 마크다운을 모두 작성하면 됨 
	- 이건 posts뿐 아니라 `archives`나 `about.md`처럼 메인 우상단 메뉴에서 보여주는 페이지도 마찬가지임. 단 경로가 posts가 아닌 content바로 밑에 들어간다는 점
- 여기서 겪은 짜치는 이슈
	- (이건 Hugo가 원래 그런 건지 모르겠지만) 이미지를 넣을 때 마크다운 문법으로 하면 이미지 크기 조절이 안 됨. -> Hugo 숏코드 라는 걸 사용하기로 함 (https://gohugo.io/content-management/shortcodes/)
		- 솔직히 작성할 때는 내 편집기에서 이미지를 볼 수가 없게 되니 너무 별로인 포인트. 보기는 포기해도 대충 옵시디언 템플레이터로 쉽게 넣을 수 있게는 할 수 있다고 정신승리함
	- `{{<figure src = "이미지경로" alt = "alttext" width=400>}}` 뭐 이런식인데
		- 이미지 파일을 마크다운 파일과 같은 폴더 `my-post` 내에서 관리하려고 상대경로로 입력하니까 한국어 포스트는 얘를 인식하는데 영어 버전 포스트는 인식을 못함 ..
		- 해결책: **이미지 경로는 절대경로로 입력한다**


# 왜 되고 왜 안 되는지 모르겠는 폰트 사이즈 적용
- 기본 폰트 사이즈가 좀 큰 느낌이 있어서 폰트 사이즈를 줄이고자 custom css파일을 생성함
	- `assets/css/extended/custom.css`
- 여기에 포스트 제목, 헤더, 본문에 대한 폰트 사이즈를 줄여서 지정했는데 환장하게도
	- 크롬/사파리에서는 글씨크기가 기본적으로 더 크게 나옴. 내 주 브라우저인 젠(파이어폭스계열)에서는 같은 포스트에 대해 korean 만 (체감 80%미만) 작게 나오고 english는 크게 나오는데 크롬/사파리와 동일한 크기.
	- 브라우저마다 다른 건 차라리 이해하겠는데 젠에서 언어별로 다른 거 진짜 어처구니 없고 참을 수 없어 😠
- 이걸 고쳐보려고 한참을 이것저것 시도했으나 아무것도 통하지 않았고 허망하게도 혹시몰라서 폰트사이즈를 값이 아닌 비율로 지정하는 걸로 바꾸니 해결 완료
	- 되긴 됐지만 아직도 뭐가 문제였는지 모름


#  그외에 다국어랑은 무관한데 나에게 필요했으나 가이드에 없었던 자잘한 것들
- **latex 수식 기능**
	- 다음 파일을 생성하고 각 post 파일의 frontmatter에서 `math = True`로 설정
	- `layouts/partials/extend_head.html`
	- delimiters 지정 안 하면 block 수식은 되는데 inline 수식은 안 되는 이슈가 있었음
```html
{{- if .Params.math }}
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body, {
  delimiters: [
    {left: '$$', right: '$$', display: true},
    {left: '$', right: '$', display: false},
    {left: '\\(', right: '\\)', display: false},
    {left: '\\[', right: '\\]', display: true}
  ],
  throwOnError: false
});"></script>
{{- end }}
```

- **giscus 덧글창 추가 + 다크/라이트 테마에 따라서 자동 전환되게 하는 법**
	- giscus 자체를 적용하는 건 쉬우니까 생략
	- 현재 사이트의 테마(다크/라이트)에 따라서, 그리고 테마 토글 누를 때 giscus 덧글창도 같이 전환되도록 하려면, 다음 파일을 생성
	- `layouts/partials/comments.html`
```html
{{- if .Site.Params.giscus.repo }}
<div class="container_disqus">
#이부분은 giscus설정완료하면 복붙할 수 있는 그부분
</div>
<script>
    function getCurrentTheme() {
        let storedTheme = localStorage.getItem('pref-theme');
        if (storedTheme) {
            return storedTheme;
        }
        if (document.body.classList.contains('dark')) {
            return 'dark';
        }
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    function setGiscusTheme() {
        let currentTheme = getCurrentTheme();
        let giscusTheme = currentTheme === 'dark' ? 'noborder_dark' : 'noborder_light';
        let giscusScript = document.querySelector("div.container_disqus > script");
        if (giscusScript) {
            giscusScript.setAttribute('data-theme', giscusTheme);
        }
        return giscusTheme;
    }

    setGiscusTheme();

    document.addEventListener('DOMContentLoaded', function() {
        let themeToggle = document.querySelector('#theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                setTimeout(() => {
                    let newTheme = getCurrentTheme();
                    let newGiscusTheme = newTheme === 'dark' ? 'noborder_dark' : 'noborder_light';
                    let giscusFrame = document.querySelector('iframe.giscus-frame');
                    if (giscusFrame) {
                        giscusFrame.contentWindow.postMessage({
                            giscus: {
                                setConfig: {
                                    theme: newGiscusTheme
                                }
                            }
                        }, 'https://giscus.app');
                    }
                }, 100);
            });
        }
    });
</script>
{{- end }}
```

- **구글 서치콘솔용 사이트맵 생성**
	- 메인 config (`hugo.yaml`)에 다음 부분 설정 필요
```
sitemap:
  changefreq: daily
  filename: 'sitemap.xml'
  priority: 0.5
```

- markup setting
	- highlight 부분은 chroma highlight
		- noClass true랑 pygmentsUseClasses true는 충돌하니까 주의해서 하나만
		- **code block의 theme (syntax highlight) 바꿀 수 있게** 설정
	- renderer unsafe는 마크다운 파일에서 html 사용할 수 있게 함
		- 포스팅에서는 안 쓰지만 about 페이지의 세부 스타일 조정하는거나, **subscribe 페이지에 iframe으로 구독모집폼** 넣는 데 필요해서 썼음
			- subscribe (주소관리, 메일발송) 기능은 [brevo](https://www.brevo.com/) 사용했고 (free plan으로 충분) 유사한 이메일 마케팅 서비스가 많더라 ..
```
# pygmentsUseClasses: true
markup:
  highlight:
    noClasses: true 
    anchorLineNos: false
    codeFences: true
    guessSyntax: true
    lineNos: true
    style: nord
  goldmark:
    renderer:
      unsafe: true # to allow html in markdown files
```

