%define debug_package %{nil}

%global provider        github
%global provider_tld    com
%global project         shatteredsilicon
%global repo            qan-app
%global provider_prefix %{provider}.%{provider_tld}/%{project}/%{repo}
%global esbuild_version 0.14.22
%global x_sys_version   aa78b53

Name:		ssm-qan-app
Version:	%{_version}
Release:	%{_release}
Summary:	Query Analytics API for SSM

License:	AGPLv3
URL:		https://%{provider_prefix}
Source0:	%{name}-%{version}.tar.gz
Source1:    https://github.com/evanw/esbuild/archive/v%{esbuild_version}/esbuild-v%{esbuild_version}.tar.gz
Source2:    https://github.com/golang/sys/archive/%{x_sys_version}/sys-%{x_sys_version}.tar.gz

BuildRequires:	nodejs npm golang
Requires:	nginx

%description
Shattered Silicon Query Analytics (QAN) API is part of Shattered Silicon Monitoring and Management.
See the SSM docs for more information.


%prep
%setup -q -n %{name}
%setup -q -T -D -a 1 -n %{name}
%setup -q -T -D -a 2 -n %{name}
sed -i 's/"version": "[^"]*"/"version": "%{version}-%{release}"/' env.json

%build
export NODE_OPTIONS=--max-old-space-size=4096
chmod -R a+rw node_modules

# build esbuild
mkdir -p esbuild-%{esbuild_version}/vendor/golang.org/x
mv sys-%{x_sys_version}* esbuild-%{esbuild_version}/vendor/golang.org/x/sys
pushd esbuild-%{esbuild_version}
    go build -mod vendor ./cmd/esbuild
popd
mv esbuild-%{esbuild_version}/esbuild ./node_modules/esbuild/bin/esbuild

ESBUILD_BINARY_PATH="$(pwd)/node_modules/esbuild/bin/esbuild" npm run build

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
