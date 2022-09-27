%define debug_package %{nil}

%global provider        github
%global provider_tld	com
%global project         shatteredsilicon
%global repo            qan-app
%global provider_prefix	%{provider}.%{provider_tld}/%{project}/%{repo}

Name:		ssm-qan-app
Version:	%{_version}
Release:	1%{?dist}
Summary:	Query Analytics API for SSM

License:	AGPLv3
URL:		https://%{provider_prefix}
Source0:	%{name}-%{version}.tar.gz

BuildRequires:	nodejs npm
Requires:	nginx

%description
Shattered Silicon Query Analytics (QAN) API is part of Shattered Silicon Monitoring and Management.
See the SSM docs for more information.


%prep
%setup -q -n %{name}
sed -i 's/"version": "v[0-9].[0-9].[0-9]"/"version": "v%{version}"/' package.json

%build
export NODE_OPTIONS=--max_old_space_size=4096
npm run build

%install
install -d %{buildroot}%{_datadir}/%{name}
cp -pav ./dist/qan-app/*    %{buildroot}%{_datadir}/%{name}


%files
%license LICENSE
%doc README.md
%{_datadir}/%{name}


%changelog
* Mon Jun 25 2018 Mykola Marzhan <mykola.marzhan@percona.com> - 1.12.0-3
- PMM-2660 bump version

* Mon Jun 18 2018 Mykola Marzhan <mykola.marzhan@percona.com> - 1.12.0-2
- PMM-2580 use pre-built dir

* Tue Jun 12 2018 Mykola Marzhan <mykola.marzhan@percona.com> - 1.12.0-1
- PMM-2617 update node_modules

* Wed Feb 21 2018 Mykola Marzhan <mykola.marzhan@percona.com> - 1.8.0-3
- PMM-2002 update node_modules

* Mon Nov 20 2017 Mykola Marzhan <mykola.marzhan@percona.com> - 1.5.0-2
- PMM-1680 fix build path

* Mon Jun 26 2017 Mykola Marzhan <mykola.marzhan@percona.com> - 1.3.0-1
- up to 1.3.0

* Mon Jun 26 2017 Mykola Marzhan <mykola.marzhan@percona.com> - 1.2.1-1
- up to 1.2.1
- use prefetched node_modules

* Mon Jun 26 2017 Mykola Marzhan <mykola.marzhan@percona.com> - 1.1.6-1
- PMM-1087 fix QAN2 package building issue

* Thu Feb  2 2017 Mykola Marzhan <mykola.marzhan@percona.com> - 1.1.4-1
- add angular2 support

* Thu Feb  2 2017 Mykola Marzhan <mykola.marzhan@percona.com> - 1.1.0-1
- add build_timestamp to Release value
- use bower deps from main archive

* Mon Jan 23 2017 Mykola Marzhan <mykola.marzhan@percona.com> - 1.0.7-3
- fix version inside index.html

* Wed Dec 28 2016 Mykola Marzhan <mykola.marzhan@percona.com> - 1.0.7-2
- fix client/app/app.js

* Mon Dec 19 2016 Mykola Marzhan <mykola.marzhan@percona.com> - 1.0.7-1
- init version
