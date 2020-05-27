var RECORD_SEP = String.fromCharCode(30);
var UNIT_SEP = String.fromCharCode(31);
var FILES_ENABLED = false;
try {
	new File([""], "");
	FILES_ENABLED = true;
} catch (e) {} // safari, ie

// Tests for the core parser using new Papa.Parser().parse() (CSV to JSON)
var CORE_PARSER_TESTS = [
	{
		description: "One row",
		input: 'A,b,c',
		expected: {
			data: [['A', 'b', 'c']],
			errors: []
		}
	},
	{
		description: "Two rows",
		input: 'A,b,c\nd,E,f',
		expected: {
			data: [['A', 'b', 'c'], ['d', 'E', 'f']],
			errors: []
		}
	},
	{
		description: "Three rows",
		input: 'A,b,c\nd,E,f\nG,h,i',
		expected: {
			data: [['A', 'b', 'c'], ['d', 'E', 'f'], ['G', 'h', 'i']],
			errors: []
		}
	},
	{
		description: "Whitespace at edges of unquoted field",
		input: 'a,  b ,c',
		notes: "Extra whitespace should graciously be preserved",
		expected: {
			data: [['a', '  b ', 'c']],
			errors: []
		}
	},
	{
		description: "Quoted field",
		input: 'A,"B",C',
		expected: {
			data: [['A', 'B', 'C']],
			errors: []
		}
	},
	{
		description: "Quoted field with extra whitespace on edges",
		input: 'A," B  ",C',
		expected: {
			data: [['A', ' B  ', 'C']],
			errors: []
		}
	},
	{
		description: "Quoted field with delimiter",
		input: 'A,"B,B",C',
		expected: {
			data: [['A', 'B,B', 'C']],
			errors: []
		}
	},
	{
		description: "Quoted field with line break",
		input: 'A,"B\nB",C',
		expected: {
			data: [['A', 'B\nB', 'C']],
			errors: []
		}
	},
	{
		description: "Quoted fields with line breaks",
		input: 'A,"B\nB","C\nC\nC"',
		expected: {
			data: [['A', 'B\nB', 'C\nC\nC']],
			errors: []
		}
	},
	{
		description: "Quoted fields at end of row with delimiter and line break",
		input: 'a,b,"c,c\nc"\nd,e,f',
		expected: {
			data: [['a', 'b', 'c,c\nc'], ['d', 'e', 'f']],
			errors: []
		}
	},
	{
		description: "Quoted field with escaped quotes",
		input: 'A,"B""B""B",C',
		expected: {
			data: [['A', 'B"B"B', 'C']],
			errors: []
		}
	},
	{
		description: "Quoted field with escaped quotes at boundaries",
		input: 'A,"""B""",C',
		expected: {
			data: [['A', '"B"', 'C']],
			errors: []
		}
	},
	{
		description: "Unquoted field with quotes at end of field",
		notes: "The quotes character is misplaced, but shouldn't generate an error or break the parser",
		input: 'A,B",C',
		expected: {
			data: [['A', 'B"', 'C']],
			errors: []
		}
	},
	{
		description: "Quoted field with quotes around delimiter",
		input: 'A,""",""",C',
		notes: "For a boundary to exist immediately before the quotes, we must not already be in quotes",
		expected: {
			data: [['A', '","', 'C']],
			errors: []
		}
	},
	{
		description: "Quoted field with quotes on right side of delimiter",
		input: 'A,",""",C',
		notes: "Similar to the test above but with quotes only after the comma",
		expected: {
			data: [['A', ',"', 'C']],
			errors: []
		}
	},
	{
		description: "Quoted field with quotes on left side of delimiter",
		input: 'A,""",",C',
		notes: "Similar to the test above but with quotes only before the comma",
		expected: {
			data: [['A', '",', 'C']],
			errors: []
		}
	},
	{
		description: "Quoted field with 5 quotes in a row and a delimiter in there, too",
		input: '"1","cnonce="""",nc=""""","2"',
		notes: "Actual input reported in issue #121",
		expected: {
			data: [['1', 'cnonce="",nc=""', '2']],
			errors: []
		}
	},
	{
		description: "Quoted field with whitespace around quotes",
		input: 'A, "B" ,C',
		notes: "The quotes must be immediately adjacent to the delimiter to indicate a quoted field",
		expected: {
			data: [['A', ' "B" ', 'C']],
			errors: []
		}
	},
	{
		description: "Misplaced quotes in data, not as opening quotes",
		input: 'A,B "B",C',
		notes: "The input is technically malformed, but this syntax should not cause an error",
		expected: {
			data: [['A', 'B "B"', 'C']],
			errors: []
		}
	},
	{
		description: "Quoted field has no closing quote",
		input: 'a,"b,c\nd,e,f',
		expected: {
			data: [['a', 'b,c\nd,e,f']],
			errors: [{
				"type": "Quotes",
				"code": "MissingQuotes",
				"message": "Quoted field unterminated",
				"row": 0,
				"index": 3
			}]
		}
	},
	{
		description: "Line starts with quoted field",
		input: 'a,b,c\n"d",e,f',
		expected: {
			data: [['a', 'b', 'c'], ['d', 'e', 'f']],
			errors: []
		}
	},
	{
		description: "Line ends with quoted field",
		input: 'a,b,c\nd,e,f\n"g","h","i"\n"j","k","l"',
		expected: {
			data: [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i'], ['j', 'k', 'l']],
			errors: []
		}
	},
	{
		description: "Quoted field at end of row (but not at EOF) has quotes",
		input: 'a,b,"c""c"""\nd,e,f',
		expected: {
			data: [['a', 'b', 'c"c"'], ['d', 'e', 'f']],
			errors: []
		}
	},
	{
		description: "Multiple consecutive empty fields",
		input: 'a,b,,,c,d\n,,e,,,f',
		expected: {
			data: [['a', 'b', '', '', 'c', 'd'], ['', '', 'e', '', '', 'f']],
			errors: []
		}
	},
	{
		description: "Empty input string",
		input: '',
		expected: {
			data: [],
			errors: []
		}
	},
	{
		description: "Input is just the delimiter (2 empty fields)",
		input: ',',
		expected: {
			data: [['', '']],
			errors: []
		}
	},
	{
		description: "Input is just empty fields",
		input: ',,\n,,,',
		expected: {
			data: [['', '', ''], ['', '', '', '']],
			errors: []
		}
	},
	{
		description: "Input is just a string (a single field)",
		input: 'Abc def',
		expected: {
			data: [['Abc def']],
			errors: []
		}
	},
	{
		description: "Commented line at beginning",
		input: '# Comment!\na,b,c',
		config: { comments: true },
		expected: {
			data: [['a', 'b', 'c']],
			errors: []
		}
	},
	{
		description: "Commented line in middle",
		input: 'a,b,c\n# Comment\nd,e,f',
		config: { comments: true },
		expected: {
			data: [['a', 'b', 'c'], ['d', 'e', 'f']],
			errors: []
		}
	},
	{
		description: "Commented line at end",
		input: 'a,true,false\n# Comment',
		config: { comments: true },
		expected: {
			data: [['a', 'true', 'false']],
			errors: []
		}
	},
	{
		description: "Two comment lines consecutively",
		input: 'a,b,c\n#comment1\n#comment2\nd,e,f',
		config: { comments: true },
		expected: {
			data: [['a', 'b', 'c'], ['d', 'e', 'f']],
			errors: []
		}
	},
	{
		description: "Two comment lines consecutively at end of file",
		input: 'a,b,c\n#comment1\n#comment2',
		config: { comments: true },
		expected: {
			data: [['a', 'b', 'c']],
			errors: []
		}
	},
	{
		description: "Three comment lines consecutively at beginning of file",
		input: '#comment1\n#comment2\n#comment3\na,b,c',
		config: { comments: true },
		expected: {
			data: [['a', 'b', 'c']],
			errors: []
		}
	},
	{
		description: "Entire file is comment lines",
		input: '#comment1\n#comment2\n#comment3',
		config: { comments: true },
		expected: {
			data: [],
			errors: []
		}
	},
	{
		description: "Comment with non-default character",
		input: 'a,b,c\n!Comment goes here\nd,e,f',
		config: { comments: '!' },
		expected: {
			data: [['a', 'b', 'c'], ['d', 'e', 'f']],
			errors: []
		}
	},
	{
		description: "Bad comments value specified",
		notes: "Should silently disable comment parsing",
		input: 'a,b,c\n5comment\nd,e,f',
		config: { comments: 5 },
		expected: {
			data: [['a', 'b', 'c'], ['5comment'], ['d', 'e', 'f']],
			errors: []
		}
	},
	{
		description: "Multi-character comment string",
		input: 'a,b,c\n=N(Comment)\nd,e,f',
		config: { comments: "=N(" },
		expected: {
			data: [['a', 'b', 'c'], ['d', 'e', 'f']],
			errors: []
		}
	},
	{
		description: "Input with only a commented line",
		input: '#commented line',
		config: { comments: true, delimiter: ',' },
		expected: {
			data: [],
			errors: []
		}
	},
	{
		description: "Input with only a commented line and blank line after",
		input: '#commented line\n',
		config: { comments: true, delimiter: ',' },
		expected: {
			data: [['']],
			errors: []
		}
	},
	{
		description: "Input with only a commented line, without comments enabled",
		input: '#commented line',
		config: { delimiter: ',' },
		expected: {
			data: [['#commented line']],
			errors: []
		}
	},
	{
		description: "Input without comments with line starting with whitespace",
		input: 'a\n b\nc',
		config: { delimiter: ',' },
		notes: "\" \" == false, but \" \" !== false, so === comparison is required",
		expected: {
			data: [['a'], [' b'], ['c']],
			errors: []
		}
	},
	{
		description: "Multiple rows, one column (no delimiter found)",
		input: 'a\nb\nc\nd\ne',
		expected: {
			data: [['a'], ['b'], ['c'], ['d'], ['e']],
			errors: []
		}
	},
	{
		description: "One column input with empty fields",
		input: 'a\nb\n\n\nc\nd\ne\n',
		expected: {
			data: [['a'], ['b'], [''], [''], ['c'], ['d'], ['e'], ['']],
			errors: []
		}
	},
	{
		description: "Fast mode, basic",
		input: 'a,b,c\nd,e,f',
		config: { fastMode: true },
		expected: {
			data: [['a', 'b', 'c'], ['d', 'e', 'f']],
			errors: []
		}
	},
	{
		description: "Fast mode with comments",
		input: '// Commented line\na,b,c',
		config: { fastMode: true, comments: "//" },
		expected: {
			data: [['a', 'b', 'c']],
			errors: []
		}
	},
	{
		description: "Fast mode with preview",
		input: 'a,b,c\nd,e,f\nh,j,i\n',
		config: { fastMode: true, preview: 2 },
		expected: {
			data: [['a', 'b', 'c'], ['d', 'e', 'f']],
			errors: []
		}
	},
	{
		description: "Fast mode with blank line at end",
		input: 'a,b,c\n',
		config: { fastMode: true },
		expected: {
			data: [['a', 'b', 'c'], ['']],
			errors: []
		}
	}
];


// Tests for Papa.parse() function -- high-level wrapped parser (CSV to JSON)
var PARSE_TESTS = [
	{
		description: "Two rows, just \\r",
		input: 'A,b,c\rd,E,f',
		expected: {
			data: [['A', 'b', 'c'], ['d', 'E', 'f']],
			errors: []
		}
	},
	{
		description: "Two rows, \\r\\n",
		input: 'A,b,c\r\nd,E,f',
		expected: {
			data: [['A', 'b', 'c'], ['d', 'E', 'f']],
			errors: []
		}
	},
	{
		description: "Quoted field with \\r\\n",
		input: 'A,"B\r\nB",C',
		expected: {
			data: [['A', 'B\r\nB', 'C']],
			errors: []
		}
	},
	{
		description: "Quoted field with \\r",
		input: 'A,"B\rB",C',
		expected: {
			data: [['A', 'B\rB', 'C']],
			errors: []
		}
	},
	{
		description: "Quoted field with \\n",
		input: 'A,"B\nB",C',
		expected: {
			data: [['A', 'B\nB', 'C']],
			errors: []
		}
	},
	{
		description: "Header row with one row of data",
		input: 'A,B,C\r\na,b,c',
		config: { header: true },
		expected: {
			data: [{"A": "a", "B": "b", "C": "c"}],
			errors: []
		}
	},
	{
		description: "Header row only",
		input: 'A,B,C',
		config: { header: true },
		expected: {
			data: [],
			errors: []
		}
	},
	{
		description: "Row with too few fields",
		input: 'A,B,C\r\na,b',
		config: { header: true },
		expected: {
			data: [{"A": "a", "B": "b"}],
			errors: [{
				"type": "FieldMismatch",
				"code": "TooFewFields",
				"message": "Too few fields: expected 3 fields but parsed 2",
				"row": 0
			}]
		}
	},
	{
		description: "Row with too many fields",
		input: 'A,B,C\r\na,b,c,d,e\r\nf,g,h',
		config: { header: true },
		expected: {
			data: [{"A": "a", "B": "b", "C": "c", "__parsed_extra": ["d", "e"]}, {"A": "f", "B": "g", "C": "h"}],
			errors: [{
				"type": "FieldMismatch",
				"code": "TooManyFields",
				"message": "Too many fields: expected 3 fields but parsed 5",
				"row": 0
			}]
		}
	},
	{
		description: "Row with enough fields but blank field at end",
		input: 'A,B,C\r\na,b,',
		config: { header: true },
		expected: {
			data: [{"A": "a", "B": "b", "C": ""}],
			errors: []
		}
	},
	{
		description: "Tab delimiter",
		input: 'a\tb\tc\r\nd\te\tf',
		config: { delimiter: "\t" },
		expected: {
			data: [['a', 'b', 'c'], ['d', 'e', 'f']],
			errors: []
		}
	},
	{
		description: "Pipe delimiter",
		input: 'a|b|c\r\nd|e|f',
		config: { delimiter: "|" },
		expected: {
			data: [['a', 'b', 'c'], ['d', 'e', 'f']],
			errors: []
		}
	},
	{
		description: "ASCII 30 delimiter",
		input: 'a'+RECORD_SEP+'b'+RECORD_SEP+'c\r\nd'+RECORD_SEP+'e'+RECORD_SEP+'f',
		config: { delimiter: RECORD_SEP },
		expected: {
			data: [['a', 'b', 'c'], ['d', 'e', 'f']],
			errors: []
		}
	},
	{
		description: "ASCII 31 delimiter",
		input: 'a'+UNIT_SEP+'b'+UNIT_SEP+'c\r\nd'+UNIT_SEP+'e'+UNIT_SEP+'f',
		config: { delimiter: UNIT_SEP },
		expected: {
			data: [['a', 'b', 'c'], ['d', 'e', 'f']],
			errors: []
		}
	},
	{
		description: "Bad delimiter",
		input: 'a,b,c',
		config: { delimiter: "DELIM" },
		notes: "Should silently default to comma",
		expected: {
			data: [['a', 'b', 'c']],
			errors: []
		}
	},
	{
		description: "Dynamic typing converts numeric literals",
		input: '1,2.2,1e3\r\n-4,-4.5,-4e-5\r\n-,5a,5-2',
		config: { dynamicTyping: true },
		expected: {
			data: [[1, 2.2, 1000], [-4, -4.5, -0.00004], ["-", "5a", "5-2"]],
			errors: []
		}
	},
	{
		description: "Dynamic typing converts boolean literals",
		input: 'true,false,T,F,TRUE,False',
		config: { dynamicTyping: true },
		expected: {
			data: [[true, false, "T", "F", "TRUE", "False"]],
			errors: []
		}
	},
	{
		description: "Dynamic typing doesn't convert other types",
		input: 'A,B,C\r\nundefined,null,[\r\nvar,float,if',
		config: { dynamicTyping: true },
		expected: {
			data: [["A", "B", "C"], ["undefined", "null", "["], ["var", "float", "if"]],
			errors: []
		}
	},
	{
		description: "Blank line at beginning",
		input: '\r\na,b,c\r\nd,e,f',
		config: { newline: '\r\n' },
		expected: {
			data: [[''], ['a', 'b', 'c'], ['d', 'e', 'f']],
			errors: []
		}
	},
	{
		description: "Blank line in middle",
		input: 'a,b,c\r\n\r\nd,e,f',
		config: { newline: '\r\n' },
		expected: {
			data: [['a', 'b', 'c'], [''], ['d', 'e', 'f']],
			errors: []
		}
	},
	{
		description: "Blank lines at end",
		input: 'a,b,c\nd,e,f\n\n',
		expected: {
			data: [['a', 'b', 'c'], ['d', 'e', 'f'], [''], ['']],
			errors: []
		}
	},
	{
		description: "Blank line in middle with whitespace",
		input: 'a,b,c\r\n \r\nd,e,f',
		expected: {
			data: [['a', 'b', 'c'], [" "], ['d', 'e', 'f']],
			errors: []
		}
	},
	{
		description: "First field of a line is empty",
		input: 'a,b,c\r\n,e,f',
		expected: {
			data: [['a', 'b', 'c'], ['', 'e', 'f']],
			errors: []
		}
	},
	{
		description: "Last field of a line is empty",
		input: 'a,b,\r\nd,e,f',
		expected: {
			data: [['a', 'b', ''], ['d', 'e', 'f']],
			errors: []
		}
	},
	{
		description: "Other fields are empty",
		input: 'a,,c\r\n,,',
		expected: {
			data: [['a', '', 'c'], ['', '', '']],
			errors: []
		}
	},
	{
		description: "Empty input string",
		input: '',
		expected: {
			data: [],
			errors: [{
				"type": "Delimiter",
				"code": "UndetectableDelimiter",
				"message": "Unable to auto-detect delimiting character; defaulted to ','"
			}]
		}
	},
	{
		description: "Input is just the delimiter (2 empty fields)",
		input: ',',
		expected: {
			data: [['', '']],
			errors: []
		}
	},
	{
		description: "Input is just a string (a single field)",
		input: 'Abc def',
		expected: {
			data: [['Abc def']],
			errors: [
				{
					"type": "Delimiter",
					"code": "UndetectableDelimiter",
					"message": "Unable to auto-detect delimiting character; defaulted to ','"
				}
			]
		}
	},
	{
		description: "Preview 0 rows should default to parsing all",
		input: 'a,b,c\r\nd,e,f\r\ng,h,i',
		config: { preview: 0 },
		expected: {
			data: [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i']],
			errors: []
		}
	},
	{
		description: "Preview 1 row",
		input: 'a,b,c\r\nd,e,f\r\ng,h,i',
		config: { preview: 1 },
		expected: {
			data: [['a', 'b', 'c']],
			errors: []
		}
	},
	{
		description: "Preview 2 rows",
		input: 'a,b,c\r\nd,e,f\r\ng,h,i',
		config: { preview: 2 },
		expected: {
			data: [['a', 'b', 'c'], ['d', 'e', 'f']],
			errors: []
		}
	},
	{
		description: "Preview all (3) rows",
		input: 'a,b,c\r\nd,e,f\r\ng,h,i',
		config: { preview: 3 },
		expected: {
			data: [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i']],
			errors: []
		}
	},
	{
		description: "Preview more rows than input has",
		input: 'a,b,c\r\nd,e,f\r\ng,h,i',
		config: { preview: 4 },
		expected: {
			data: [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i']],
			errors: []
		}
	},
	{
		description: "Preview should count rows, not lines",
		input: 'a,b,c\r\nd,e,"f\r\nf",g,h,i',
		config: { preview: 2 },
		expected: {
			data: [['a', 'b', 'c'], ['d', 'e', 'f\r\nf', 'g', 'h', 'i']],
			errors: []
		}
	},
	{
		description: "Preview with header row",
		notes: "Preview is defined to be number of rows of input not including header row",
		input: 'a,b,c\r\nd,e,f\r\ng,h,i\r\nj,k,l',
		config: { header: true, preview: 2 },
		expected: {
			data: [{"a": "d", "b": "e", "c": "f"}, {"a": "g", "b": "h", "c": "i"}],
			errors: []
		}
	},
	{
		description: "Empty lines",
		input: '\na,b,c\n\nd,e,f\n\n',
		config: { delimiter: ',' },
		expected: {
			data: [[''], ['a', 'b', 'c'], [''], ['d', 'e', 'f'], [''], ['']],
			errors: []
		}
	},
	{
		description: "Skip empty lines",
		input: 'a,b,c\n\nd,e,f',
		config: { skipEmptyLines: true },
		expected: {
			data: [['a', 'b', 'c'], ['d', 'e', 'f']],
			errors: []
		}
	},
	{
		description: "Skip empty lines, with newline at end of input",
		input: 'a,b,c\r\n\r\nd,e,f\r\n',
		config: { skipEmptyLines: true },
		expected: {
			data: [['a', 'b', 'c'], ['d', 'e', 'f']],
			errors: []
		}
	},
	{
		description: "Skip empty lines, with empty input",
		input: '',
		config: { skipEmptyLines: true },
		expected: {
			data: [],
			errors: [
				{
					"type": "Delimiter",
					"code": "UndetectableDelimiter",
					"message": "Unable to auto-detect delimiting character; defaulted to ','"
				}
			]
		}
	},
	{
		description: "Skip empty lines, with first line only whitespace",
		notes: "A line must be absolutely empty to be considered empty",
		input: ' \na,b,c',
		config: { skipEmptyLines: true, delimiter: ',' },
		expected: {
			data: [[" "], ['a', 'b', 'c']],
			errors: []
		}
	}
];







// Tests for Papa.parse() that involve asynchronous operation
var PARSE_ASYNC_TESTS = [
	{
		description: "Simple worker",
		input: "A,B,C\nX,Y,Z",
		config: {
			worker: true,
		},
		expected: {
			data: [['A','B','C'],['X','Y','Z']],
			errors: []
		}
	},
	{
		description: "Simple download",
		input: "sample.csv",
		config: {
			download: true
		},
		expected: {
			data: [['A','B','C'],['X','Y','Z']],
			errors: []
		}
	},
	{
		description: "Simple download + worker",
		input: "tests/sample.csv",
		config: {
			worker: true,
			download: true
		},
		expected: {
			data: [['A','B','C'],['X','Y','Z']],
			errors: []
		}
	},
	{
		description: "Simple file",
		disabled: !FILES_ENABLED,
		input: FILES_ENABLED ? new File(["A,B,C\nX,Y,Z"], "sample.csv") : false,
		config: {
		},
		expected: {
			data: [['A','B','C'],['X','Y','Z']],
			errors: []
		}
	},
	{
		description: "Simple file + worker",
		disabled: !FILES_ENABLED,
		input: FILES_ENABLED ? new File(["A,B,C\nX,Y,Z"], "sample.csv") : false,
		config: {
			worker: true,
		},
		expected: {
			data: [['A','B','C'],['X','Y','Z']],
			errors: []
		}
	}
];








// Tests for Papa.unparse() function (JSON to CSV)
var UNPARSE_TESTS = [
	{
		description: "A simple row",
		notes: "Comma should be default delimiter",
		input: [['A', 'b', 'c']],
		expected: 'A,b,c'
	},
	{
		description: "Two rows",
		input: [['A', 'b', 'c'], ['d', 'E', 'f']],
		expected: 'A,b,c\r\nd,E,f'
	},
	{
		description: "Data with quotes",
		input: [['a', '"b"', 'c'], ['"d"', 'e', 'f']],
		expected: 'a,"""b""",c\r\n"""d""",e,f'
	},
	{
		description: "Data with newlines",
		input: [['a', 'b\nb', 'c'], ['d', 'e', 'f\r\nf']],
		expected: 'a,"b\nb",c\r\nd,e,"f\r\nf"'
	},
	{
		description: "Array of objects (header row)",
		input: [{ "Col1": "a", "Col2": "b", "Col3": "c" }, { "Col1": "d", "Col2": "e", "Col3": "f" }],
		expected: 'Col1,Col2,Col3\r\na,b,c\r\nd,e,f'
	},
	{
		description: "With header row, missing a field in a row",
		input: [{ "Col1": "a", "Col2": "b", "Col3": "c" }, { "Col1": "d", "Col3": "f" }],
		expected: 'Col1,Col2,Col3\r\na,b,c\r\nd,,f'
	},
	{
		description: "With header row, with extra field in a row",
		notes: "Extra field should be ignored; first object in array dictates header row",
		input: [{ "Col1": "a", "Col2": "b", "Col3": "c" }, { "Col1": "d", "Col2": "e", "Extra": "g", "Col3": "f" }],
		expected: 'Col1,Col2,Col3\r\na,b,c\r\nd,e,f'
	},
	{
		description: "Specifying column names and data separately",
		input: { fields: ["Col1", "Col2", "Col3"], data: [["a", "b", "c"], ["d", "e", "f"]] },
		expected: 'Col1,Col2,Col3\r\na,b,c\r\nd,e,f'
	},
	{
		description: "Specifying column names only (no data)",
		notes: "Papa should add a data property that is an empty array to prevent errors (no copy is made)",
		input: { fields: ["Col1", "Col2", "Col3"] },
		expected: 'Col1,Col2,Col3'
	},
	{
		description: "Specifying data only (no field names), improperly",
		notes: "A single array for a single row is wrong, but it can be compensated.<br>Papa should add empty fields property to prevent errors.",
		input: { data: ["abc", "d", "ef"] },
		expected: 'abc,d,ef'
	},
	{
		description: "Specifying data only (no field names), properly",
		notes: "An array of arrays, even if just a single row.<br>Papa should add empty fields property to prevent errors.",
		input: { data: [["a", "b", "c"]] },
		expected: 'a,b,c'
	},
	{
		description: "Custom delimiter (semicolon)",
		input: [['A', 'b', 'c'], ['d', 'e', 'f']],
		config: { delimiter: ';' },
		expected: 'A;b;c\r\nd;e;f'
	},
	{
		description: "Custom delimiter (tab)",
		input: [['Ab', 'cd', 'ef'], ['g', 'h', 'ij']],
		config: { delimiter: '\t' },
		expected: 'Ab\tcd\tef\r\ng\th\tij'
	},
	{
		description: "Custom delimiter (ASCII 30)",
		input: [['a', 'b', 'c'], ['d', 'e', 'f']],
		config: { delimiter: RECORD_SEP },
		expected: 'a'+RECORD_SEP+'b'+RECORD_SEP+'c\r\nd'+RECORD_SEP+'e'+RECORD_SEP+'f'
	},
	{
		description: "Bad delimiter (\\n)",
		notes: "Should default to comma",
		input: [['a', 'b', 'c'], ['d', 'e', 'f']],
		config: { delimiter: '\n' },
		expected: 'a,b,c\r\nd,e,f'
	},
	{
		description: "Custom line ending (\\r)",
		input: [['a', 'b', 'c'], ['d', 'e', 'f']],
		config: { newline: '\r' },
		expected: 'a,b,c\rd,e,f'
	},
	{
		description: "Custom line ending (\\n)",
		input: [['a', 'b', 'c'], ['d', 'e', 'f']],
		config: { newline: '\n' },
		expected: 'a,b,c\nd,e,f'
	},
	{
		description: "Custom, but strange, line ending ($)",
		input: [['a', 'b', 'c'], ['d', 'e', 'f']],
		config: { newline: '$' },
		expected: 'a,b,c$d,e,f'
	},
	{
		description: "Force quotes around all fields",
		input: [['a', 'b', 'c'], ['d', 'e', 'f']],
		config: { quotes: true },
		expected: '"a","b","c"\r\n"d","e","f"'
	},
	{
		description: "Force quotes around all fields (with header row)",
		input: [{ "Col1": "a", "Col2": "b", "Col3": "c" }, { "Col1": "d", "Col2": "e", "Col3": "f" }],
		config: { quotes: true },
		expected: '"Col1","Col2","Col3"\r\n"a","b","c"\r\n"d","e","f"'
	},
	{
		description: "Force quotes around certain fields only",
		input: [['a', 'b', 'c'], ['d', 'e', 'f']],
		config: { quotes: [true, false, true] },
		expected: '"a",b,"c"\r\n"d",e,"f"'
	},
	{
		description: "Force quotes around certain fields only (with header row)",
		input: [{ "Col1": "a", "Col2": "b", "Col3": "c" }, { "Col1": "d", "Col2": "e", "Col3": "f" }],
		config: { quotes: [true, false, true] },
		expected: '"Col1",Col2,"Col3"\r\n"a",b,"c"\r\n"d",e,"f"'
	},
	{
		description: "Empty input",
		input: [],
		expected: ''
	},
	{
		description: "Mismatched field counts in rows",
		input: [['a', 'b', 'c'], ['d', 'e'], ['f']],
		expected: 'a,b,c\r\nd,e\r\nf'
	},
	{
		description: "JSON null is treated as empty value",
		input: [{ "Col1": "a", "Col2": null, "Col3": "c" }],
		expected: 'Col1,Col2,Col3\r\na,,c'
	}
];



var CUSTOM_TESTS = [
	{
		description: "Step is called for each row",
		expected: 2,
		run: function(callback) {
			var callCount = 0;
			Papa.parse('A,b,c\nd,E,f', {
				step: function() {
					callCount++;
				},
				complete: function() {
					callback(callCount);
				}
			});
		}
	},
	{
		description: "Step is called with the contents of the row",
		expected: ['A', 'b', 'c'],
		run: function(callback) {
			Papa.parse('A,b,c', {
				step: function(response) {
					callback(response.data[0]);
				}
			});
		}
	},
	{
		description: "Step is called with the last cursor position",
		expected: [6, 12, 17],
		run: function(callback) {
			var updates = [];
			Papa.parse('A,b,c\nd,E,f\nG,h,i', {
				step: function(response) {
					updates.push(response.meta.cursor);
				},
				complete: function() {
					callback(updates);
				}
			});
		}
	},
	{
		description: "Step exposes cursor for downloads",
		expected: [129,	287, 452, 595, 727, 865, 1031, 1209],
		run: function(callback) {
			var updates = [];
			Papa.parse("/tests/long-sample.csv", {
				download: true,
				step: function(response) {
					updates.push(response.meta.cursor);
				},
				complete: function() {
					callback(updates);
				}
			});
		}
	},
	{
		description: "Step exposes cursor for chunked downloads",
		expected: [129,	287, 452, 595, 727, 865, 1031, 1209],
		run: function(callback) {
			var updates = [];
			Papa.parse("/tests/long-sample.csv", {
				download: true,
				chunkSize: 500,
				step: function(response) {
					updates.push(response.meta.cursor);
				},
				complete: function() {
					callback(updates);
				}
			});
		}
	},
	{
		description: "Step exposes cursor for workers",
		expected: [452, 452, 452, 865, 865, 865, 1209, 1209],
		run: function(callback) {
			var updates = [];
			Papa.parse("/tests/long-sample.csv", {
				download: true,
				chunkSize: 500,
				worker: true,
				step: function(response) {
					updates.push(response.meta.cursor);
				},
				complete: function() {
					callback(updates);
				}
			});
		}
	},
	{
		description: "Chunk is called for each chunk",
		expected: [3, 3, 2],
		run: function(callback) {
			var updates = [];
			Papa.parse("/tests/long-sample.csv", {
				download: true,
				chunkSize: 500,
				chunk: function(response) {
					updates.push(response.data.length);
				},
				complete: function() {
					callback(updates);
				}
			});
		}
	},
	{
		description: "Chunk is called with cursor position",
		expected: [452, 865, 1209],
		run: function(callback) {
			var updates = [];
			Papa.parse("/tests/long-sample.csv", {
				download: true,
				chunkSize: 500,
				chunk: function(response) {
					updates.push(response.meta.cursor);
				},
				complete: function() {
					callback(updates);
				}
			});
		}
	},
	{
		description: "Step exposes indexes for files",
		expected: [6, 12, 17],
		disabled: !FILES_ENABLED,
		run: function(callback) {
			var updates = [];
			Papa.parse(new File(['A,b,c\nd,E,f\nG,h,i'], 'sample.csv'), {
				download: true,
				step: function(response) {
					updates.push(response.meta.cursor);
				},
				complete: function() {
					callback(updates);
				}
			});
		}
	},
	{
		description: "Step exposes indexes for chunked files",
		expected: [6, 12, 17],
		disabled: !FILES_ENABLED,
		run: function(callback) {
			var updates = [];
			Papa.parse(new File(['A,b,c\nd,E,f\nG,h,i'], 'sample.csv'), {
				chunkSize: 3,
				step: function(response) {
					updates.push(response.meta.cursor);
				},
				complete: function() {
					callback(updates);
				}
			});
		}
	},
	{
		description: "Quoted line breaks near chunk boundaries are handled",
		expected: [['A', 'B', 'C'], ['X', 'Y\n1\n2\n3', 'Z']],
		disabled: !FILES_ENABLED,
		run: function(callback) {
			var updates = [];
			Papa.parse(new File(['A,B,C\nX,"Y\n1\n2\n3",Z'], 'sample.csv'), {
				chunkSize: 3,
				step: function(response) {
					updates.push(response.data[0]);
				},
				complete: function() {
					callback(updates);
				}
			});
		}
	},
	{
		description: "Step functions can abort parsing",
		expected: [['A', 'b', 'c']],
		run: function(callback) {
			var updates = [];
			Papa.parse('A,b,c\nd,E,f\nG,h,i', {
				step: function(response, handle) {
					updates.push(response.data[0]);
					handle.abort();
				},
				complete: function() {
					callback(updates);
				}
			});
		}
	},
	{
		description: "Step functions can pause parsing",
		expected: [['A', 'b', 'c']],
		run: function(callback) {
			var updates = [];
			Papa.parse('A,b,c\nd,E,f\nG,h,i', {
				step: function(response, handle) {
					updates.push(response.data[0]);
					handle.pause();
					callback(updates);
				},
				complete: function() {
					callback('incorrect complete callback');
				}
			});
		}
	},
	{
		description: "Step functions can resume parsing",
		expected: [['A', 'b', 'c'], ['d', 'E', 'f'], ['G', 'h', 'i']],
		run: function(callback) {
			var updates = [];
			var handle = null;
			var first = true;
			Papa.parse('A,b,c\nd,E,f\nG,h,i', {
				step: function(response, h) {
					updates.push(response.data[0]);
					if (!first) return;
					handle = h;
					handle.pause();
					first = false;
				},
				complete: function() {
					callback(updates);
				}
			});
			setTimeout(function() {
				handle.resume();
			}, 500);
		}
	},
	{
		description: "Step functions can abort workers",
		expected: 1,
		run: function(callback) {
			var updates = 0;
			Papa.parse("/tests/long-sample.csv", {
				worker: true,
				chunkSize: 500,
				step: function(response, handle) {
					updates++;
					handle.abort();
				},
				complete: function() {
					callback(updates);
				}
			});
		}
	}
];
