module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import com.vcsdkheadless.VcSdkHeadlessPackage;',
        packageInstance: 'new VcSdkHeadlessPackage()',
      },
      ios: null,
    },
  },
};
