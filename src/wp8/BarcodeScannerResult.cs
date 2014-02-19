using System;
using System.Linq;
using System.Runtime.Serialization;

namespace BarcodeScanner
{
	[DataContract]
	public class BarcodeScannerResult
	{
		[DataMember(Name = "format")]
		public string Format { get; set; }

		[DataMember(Name = "text")]
		public string Text { get; set; }
	}
}