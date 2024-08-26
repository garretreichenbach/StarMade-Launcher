I switched everything to JavaScript as CoffeScript is too hard to work with and debug.

I also made the necessary framework changes so that we can switch Java versions.
The actual switching isn't implemented as of 8/26/2024, but the URL handling is done.
Instead of `${JAVA_URL}/jre-${javaVersion}-${platform}`
we have `${JAVA_URL}/jre-${java8Version}-${platform}`
and `${JAVA_URL}/jre-${java18Version}-${platform}`.
As such, Schine will need to add two more files to that AWS directory for each platform:
- `jre-8 (1.8.0_422)`
- `jre-18 (18.0.2.1)`

For example:
- `https://s3.amazonaws.com/sm-launcher/java/jre-1.8.0_422-windows-x64.tar.gz`
- `https://s3.amazonaws.com/sm-launcher/java/jre-18.0.2.1-windows-x64.tar.gz`

should return Java 8 and Java 18 respectively for Windows x64. I usually get the files from Adoptium's website.
You might have to rename the packages to match the above, depending on the platform and stuff.